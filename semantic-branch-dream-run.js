"use strict";
// Local diagnostic collector. It has no scorer input and emits no CDR receipt.
const childProcess = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { candidateHash, runSemanticBranchDream } = require("./semantic-branch-dream");
const { checkCandidate } = require("./candidate-checker");
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const stable = value => JSON.stringify(value, null, 2) + "\n";
const codexPath = "/Users/artem/.local/bin/codex";
const FORM_SCHEMA = { type: "object", additionalProperties: false, required: ["program", "query"], properties: { program: { type: "string" }, query: { type: "string" } } };
const HYPOTHESIS_SCHEMA = JSON.parse(fs.readFileSync(path.join(__dirname, ".cdr/waves/semantic-branch-dream-v0/branch-hypothesis-schema-v1.json"), "utf8"));
function write(file, value) { fs.writeFileSync(file, typeof value === "string" ? value : stable(value), { flag: "wx", mode: 0o600 }); }
function inspect(stdout) {
  const events = stdout.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
  const benignNotice = event => event.item?.type === "error" && event.item.message === "Skill descriptions were shortened to fit the skills context budget. Codex can still see every skill, but some descriptions are shorter. Disable unused skills or plugins to leave more room for the rest.";
  return { completed_turns: events.filter(event => event.type === "turn.completed").length, benign_notices: events.filter(benignNotice).length, forbidden: events.filter(event => event.item && !["agent_message", "reasoning"].includes(event.item.type) && !benignNotice(event)).map(event => event.item.type) };
}
function formalPrompt(item) { return `Formalize every numbered English sentence below as one complete finite-FOL candidate. Return JSON only. Use domain(person,[...]). and exactly one labelled axiom(sN, ...) for every source sentence. Preserve explicit negation, or, xor, and rules. Query is a lowercase ground unary term using the same predicate vocabulary. Do not use directives, files, shell, network, consult, assert, retract, or call.\n\nWorld:\n${item.world.map(s => `${s.id}: ${s.text}`).join("\n")}\n\nQuestion:\n${item.question}`; }
function hypothesisPrompt(item, baseline) { return `You are auditing a frozen Prolog formalization against its English source. Do not repair the baseline. Return zero, one, or two bounded counterfactual hypotheses in the supplied JSON schema. Set case_id exactly to ${item.case_id}. Set baseline_candidate_sha256 exactly to ${candidateHash(baseline)}. Each hypothesis must cite an exact source sentence quote and contain a complete replacement program + query candidate. Copy the frozen candidate verbatim except for one minimal named alternative: connector interpretation, predicate alias, or missing type assumption. Keep the same finite-FOL surface language: domain(person,[...]). and axiom(sN, ...), with ` + "`or`" + `, ` + "`xor`" + `, ` + "`not`" + `, and ` + "`rule`" + `. Do not introduce infix ->, &, |, ordinary Prolog rules, forall, directives, files, shell, network, consult, assert, retract, call, hidden gold, nl2fol, external knowledge, extra fields, or explanations.\n\nWorld:\n${item.world.map(s => `${s.id}: ${s.text}`).join("\n")}\n\nFrozen program:\n${baseline.program}\n\nFrozen query:\n${baseline.query}`; }
async function invoke({ prompt, schema, directory, label, model = "gpt-5.6-luna" }) {
  const receipt = path.join(directory, "receipt.json"); if (fs.existsSync(receipt)) return JSON.parse(fs.readFileSync(receipt, "utf8"));
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 }); const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sbd-codex-")), schemaFile = path.join(tmp, "schema.json"), final = path.join(tmp, "final.json");
  const args = ["exec", "--json", "--ephemeral", "-C", tmp, "--skip-git-repo-check", "--ignore-user-config", "--sandbox", "read-only", "--model", model, "-c", "model_reasoning_effort=high", "-c", "model_context_window=32768", "--output-schema", schemaFile, "--output-last-message", final, "-"];
  write(path.join(directory, "request.json"), { label, command: codexPath, args, prompt, prompt_sha256: sha256(prompt), schema }); fs.writeFileSync(schemaFile, stable(schema), { mode: 0o600 });
  let stdout = "", stderr = "", error = null, code = null, output = null;
  try { const result = childProcess.spawnSync(codexPath, args, { cwd: tmp, input: prompt, encoding: "utf8", timeout: 180000, maxBuffer: 8 * 1024 * 1024 }); stdout = result.stdout || ""; stderr = result.stderr || ""; code = result.status; if (result.error) error = String(result.error.message || result.error); if (code !== 0) error ||= `model_exit_${code}`; if (fs.existsSync(final)) output = JSON.parse(fs.readFileSync(final, "utf8")); else error ||= "missing_final_output"; } finally { write(path.join(directory, "stdout.jsonl"), stdout); write(path.join(directory, "stderr.txt"), stderr); fs.rmSync(tmp, { recursive: true, force: true }); }
  let audit = null; try { audit = inspect(stdout); if (audit.completed_turns !== 1 || audit.forbidden.length) error ||= "trace_gate_failed"; } catch { error ||= "invalid_event_jsonl"; }
  const result = { error, exit_code: code, output, audit, stdout_sha256: sha256(stdout), stderr_sha256: sha256(stderr) }; write(receipt, result); return result;
}
async function safeExecutor(caseId, candidate) { const checked = await checkCandidate({ caseId, ...candidate, timeoutMs: 4000, maxOutputBytes: 262144 }); const match = checked.bindings && checked.bindings.match(/^labelled_explanation\(.+?,(entailed|contradicted|unknown|conflict|invalid_program),/); return { candidate_sha256: candidateHash(candidate), execution_outcome: checked.execution_outcome, semantic_status: match ? match[1] : "unreported", bindings: checked.bindings, transcript: checked.transcript }; }
async function main(sampleFile, rawRoot) {
  const sampleText = fs.readFileSync(sampleFile, "utf8"), sample = JSON.parse(sampleText); if (sample.status !== "frozen-before-model-output" || !Array.isArray(sample.cases) || sample.cases.length !== 12) throw new Error("invalid frozen sample");
  fs.mkdirSync(rawRoot, { recursive: true, mode: 0o700 }); write(path.join(rawRoot, "provenance.json"), { status: "diagnostic-not-cdr-receipt", sample_file: path.resolve(sampleFile), sample_sha256: sha256(sampleText), model: "gpt-5.6-luna", executor: "existing immutable-candidate checker with its isolation policy", started_at: new Date().toISOString() });
  const records = [];
  for (const item of sample.cases) { const dir = path.join(rawRoot, item.case_id); const formal = await invoke({ prompt: formalPrompt(item), schema: FORM_SCHEMA, directory: path.join(dir, "formalization"), label: "formalization" }); let trace = null, hypotheses = null;
    if (!formal.error && formal.output) { const baseline = formal.output, set = await invoke({ prompt: hypothesisPrompt(item, baseline), schema: HYPOTHESIS_SCHEMA, directory: path.join(dir, "hypotheses"), label: "bounded-hypotheses" }); hypotheses = set; if (!set.error && set.output) try { trace = await runSemanticBranchDream({ caseId: item.case_id, baseline, hypothesisSet: set.output, sourceSentences: item.world, executeCandidate: safeExecutor }); } catch (error) { trace = { schema_version: "dream-trace-v1", status: "observed-not-scored", case_id: item.case_id, conclusion: "rejected_hypothesis", error: String(error.message || error) }; } }
    const record = { case_id: item.case_id, source_id: item.source_id, class: item.class, formalization: formal, hypotheses, trace }; write(path.join(dir, "record.json"), record); records.push(record); console.log(JSON.stringify({ case_id: item.case_id, formalization_error: formal.error, hypotheses_error: hypotheses && hypotheses.error, conclusion: trace && trace.conclusion })); }
  write(path.join(rawRoot, "aggregate-not-a-cdr-receipt.json"), { schema_version: "semantic-branch-dream-run-v1", status: "completed-diagnostic-not-cdr-receipt", sample_sha256: sha256(sampleText), records: records.map(r => ({ case_id: r.case_id, source_id: r.source_id, class: r.class, formalization_error: r.formalization.error, hypotheses_error: r.hypotheses && r.hypotheses.error, conclusion: r.trace && r.trace.conclusion })) });
}
if (require.main === module) main(process.argv[2], process.argv[3]).catch(error => { console.error(error.stack || error); process.exitCode = 1; });
module.exports = { FORM_SCHEMA, formalPrompt, hypothesisPrompt, inspect };
