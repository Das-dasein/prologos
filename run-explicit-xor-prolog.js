"use strict";

// One model formalization followed by deterministic Prolog answer per frozen
// case.  The scorer file is intentionally never opened here.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { runFreePrologDiagnostic } = require("./free-prolog-diagnostic");
const { invoke } = require("./near-signature-reflection-run");
const { answerFromTranscript, benchmarkQuery } = require("./run-luna-thirty-prolog-answers");
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const json = value => JSON.stringify(value, null, 2) + "\n";
const write = (file, value) => fs.writeFileSync(file, json(value), { flag: "wx", mode: 0o600 });
const wave = path.join(__dirname, ".cdr", "waves", "luna-thirty-explicit-xor-v1");
const FORM_SCHEMA = { type: "object", additionalProperties: false, required: ["program", "query"], properties: { program: { type: "string" }, query: { type: "string" } } };

function prompt(template, item) { return `${template}\n\nWorld:\n${item.context}\n\nOriginal question:\n${item.question}\n`; }
function validCandidate(candidate) { return candidate && typeof candidate.program === "string" && candidate.program.trim() && typeof candidate.query === "string" && /^labelled_explanation\(.+\)$/.test(candidate.query.trim()); }
function preflight({ waveRoot = wave }) {
  const fixtureText = fs.readFileSync(path.join(waveRoot, "fixture-draft.json"), "utf8");
  const fixture = JSON.parse(fixtureText);
  const templateText = fs.readFileSync(path.join(__dirname, ".cdr", "waves", "luna-thirty-paired-v1", "formalization.txt"), "utf8");
  if (fixture.status !== "frozen-before-model-output" || fixture.schema_version !== "proverqa-explicit-xor-visible-v1" || fixture.cases.length !== 30) throw Error("invalid_explicit_xor_fixture");
  if (new Set(fixture.cases.map(item => item.id)).size !== 30 || fixture.cases.some(item => Object.keys(item).sort().join(",") !== "context,id,question")) throw Error("fixture_visible_contract_failed");
  return { fixture, fixture_sha256: sha256(fixtureText), formalization_template: templateText, formalization_template_sha256: sha256(templateText), scorer_read: false, model_calls_planned: 30 };
}
async function run({ outputRoot, waveRoot = wave, protocol, resumeAfterUserInterrupt = false, invokeModel = invoke, execute = runFreePrologDiagnostic }) {
  if (!protocol || protocol.status !== "frozen-before-model-output") throw Error("invalid_protocol");
  if (fs.existsSync(outputRoot) && !resumeAfterUserInterrupt) throw Error("output_root_must_not_exist_no_resume");
  const gate = preflight({ waveRoot });
  if (protocol.fixture_sha256 !== gate.fixture_sha256 || protocol.formalization_template_sha256 !== gate.formalization_template_sha256) throw Error("frozen_hash_gate_failed");
  const provenanceFile = path.join(outputRoot, "provenance.json");
  if (resumeAfterUserInterrupt) {
    if (!fs.existsSync(provenanceFile)) throw Error("resume_requires_original_provenance");
    const prior = JSON.parse(fs.readFileSync(provenanceFile, "utf8"));
    if (prior.fixture_sha256 !== gate.fixture_sha256 || prior.formalization_template_sha256 !== gate.formalization_template_sha256 || prior.scorer_read !== false) throw Error("resume_provenance_mismatch");
    write(path.join(outputRoot, "user-authorized-resume.json"), { status: "resumed_once_after_user_interrupt", existing_records: gate.fixture.cases.filter(item => fs.existsSync(path.join(outputRoot, `case-${item.id}`, "record.json"))).map(item => item.id), remaining_records: gate.fixture.cases.filter(item => !fs.existsSync(path.join(outputRoot, `case-${item.id}`, "record.json"))).map(item => item.id) });
  } else {
    fs.mkdirSync(outputRoot, { recursive: true, mode: 0o700 });
    write(provenanceFile, { status: "formalize_then_deterministic_prolog_answer", fixture_sha256: gate.fixture_sha256, formalization_template_sha256: gate.formalization_template_sha256, scorer_read: false, model_calls_planned: gate.model_calls_planned, protocol });
  }
  const records = [];
  for (const item of gate.fixture.cases) {
    const root = path.join(outputRoot, `case-${item.id}`);
    const recordFile = path.join(root, "record.json");
    if (resumeAfterUserInterrupt && fs.existsSync(recordFile)) { records.push(JSON.parse(fs.readFileSync(recordFile, "utf8"))); continue; }
    if (fs.existsSync(path.join(root, "formalization", "request.json"))) throw Error(`partial_model_call_cannot_be_retried_${item.id}`);
    const m0 = invokeModel(prompt(gate.formalization_template, item), FORM_SCHEMA, path.join(root, "formalization"), protocol);
    if (m0.error || !validCandidate(m0.output)) {
      const reason = m0.error || "invalid_candidate_schema";
      write(path.join(outputRoot, "stopped.json"), { status: "stopped_before_remaining_model_calls", source_id: item.id, reason });
      throw Error(`formalization_gate_failed_${item.id}:${reason}`);
    }
    const observation = await execute({ caseId: `explicit-xor-${item.id}`, program: m0.output.program, query: benchmarkQuery(m0.output.query), source: "luna-explicit-xor-formalization", timeoutMs: protocol.runtime.timeout_ms, maxOutputBytes: protocol.runtime.max_output_bytes });
    const answer = observation.execution_outcome === "succeeded" ? answerFromTranscript(observation.runtime?.transcript?.transcript) : null;
    const record = { source_id: item.id, source_text_sha256: sha256(json(item)), program_sha256: sha256(m0.output.program), query_sha256: sha256(m0.output.query), formalization: m0, prolog_answer: answer, observation };
    write(recordFile, record);
    records.push(record);
    process.stdout.write(`${JSON.stringify({ source_id: item.id, prolog_answer: answer, execution_outcome: observation.execution_outcome })}\n`);
  }
  const result = { status: "completed-unscored-explicit-xor-development-run", fixture_sha256: gate.fixture_sha256, scorer_read: false, model_calls: records.length, resolved: records.filter(record => record.prolog_answer !== null).length, records: records.map(record => ({ source_id: record.source_id, prolog_answer: record.prolog_answer, program_sha256: record.program_sha256, query_sha256: record.query_sha256, record: `case-${record.source_id}/record.json` })) };
  write(path.join(outputRoot, "results-unscored.json"), result);
  return result;
}
if (require.main === module) {
  const protocol = JSON.parse(fs.readFileSync(path.join(wave, "protocol-draft.json"), "utf8"));
  const args = process.argv.slice(2);
  const outputRoot = args.find(arg => arg !== "--resume-after-user-interrupt") || path.join(wave, "raw-luna-explicit-xor-v1");
  run({ outputRoot, protocol, resumeAfterUserInterrupt: args.includes("--resume-after-user-interrupt") }).then(result => process.stdout.write(json(result))).catch(error => { process.stderr.write(`${error.stack || error}\n`); process.exitCode = 1; });
}
module.exports = { preflight, prompt, run, validCandidate };
