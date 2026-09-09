"use strict";
// v2: the same frozen baseline is audited by two equally bounded prompts.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { candidateHash, runSemanticBranchDream } = require("./semantic-branch-dream");
const { FORM_SCHEMA, invoke } = require("./semantic-branch-dream-run");
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const stable = value => JSON.stringify(value, null, 2) + "\n";
const root = path.join(__dirname, ".cdr/waves/semantic-branch-dream-v2");
const PLAIN_SCHEMA = JSON.parse(fs.readFileSync(path.join(root, "connector-hypothesis-schema-v2.json"), "utf8"));
const DECLARED_SCHEMA = JSON.parse(fs.readFileSync(path.join(root, "declared-connector-hypothesis-schema-v2.json"), "utf8"));
function write(file, value) { fs.writeFileSync(file, typeof value === "string" ? value : stable(value), { flag: "wx", mode: 0o600 }); }
function formalPrompt(item) { return `Formalize every numbered English sentence as one complete finite-FOL candidate. Return JSON only. Use domain(person,[all_lowercase_named_entities]) and exactly one axiom(sN, Formula) per source sentence. Use only atom, not, and, or, xor, implies, and forall(var(x,person), Formula); no rule, infix operators, ordinary Prolog clauses, directives, files, network, or uppercase variables. For a bare phrase “either A or B”, use or(A,B). Use xor(A,B) only if its text explicitly says “but not both”. If it says “or both”, “both are allowed”, or equivalent, use or(A,B). Preserve every sentence. Query is one lower-case ground unary predicate from the question, using program vocabulary.\n\nWorld:\n${item.world.map(s => `${s.id}: ${s.text}`).join("\n")}\n\nQuestion:\n${item.question}`; }
function basePrompt(item, baseline) { return `Audit one frozen complete Prolog candidate against its English source. Focus only on ${item.target_sentence_id}. Return zero or one complete connector_interpretation hypothesis. Propose a branch only if the wording of that target sentence reasonably permits both inclusive OR and exclusive XOR. If it explicitly says “but not both”, “or both”, “both are allowed”, or equivalent, return an empty hypotheses array. Do not repair unrelated errors. If you propose a branch, copy the baseline byte-for-byte except changing exactly one or( token to xor( or one xor( token to or(; keep query byte-identical.\n\nSet case_id exactly to ${item.case_id}; baseline_candidate_sha256 exactly to ${candidateHash(baseline)}. No aliases, type assumptions, extra facts, explanations, external knowledge, directives, ordinary Prolog, AST, or edit operations.\n\nWorld:\n${item.world.map(s => `${s.id}: ${s.text}`).join("\n")}\n\nTarget sentence: ${item.target_sentence_id}\nFrozen program:\n${baseline.program}\nFrozen query:\n${baseline.query}`; }
function plainPrompt(item, baseline) { return `${basePrompt(item, baseline)}\nSchema version: semantic-branch-dream-connector-v2.`; }
function declaredPrompt(item, baseline) { return `${basePrompt(item, baseline)}\nBefore choosing hypotheses, set assessment to exactly one of ambiguous, explicit_xor, explicit_or based only on the target sentence. Set hypotheses empty unless assessment is ambiguous. Schema version: semantic-branch-dream-declared-connector-v2.`; }
function asV1(set) { return { schema_version: "semantic-branch-dream-hypothesis-v1", case_id: set.case_id, baseline_candidate_sha256: set.baseline_candidate_sha256, hypotheses: set.hypotheses }; }
async function trace(item, baseline, receipt) { if (receipt.error || !receipt.output) return { conclusion: "transport_error", error: receipt.error || "missing output" }; return runSemanticBranchDream({ caseId: item.case_id, baseline, hypothesisSet: asV1(receipt.output), sourceSentences: item.world }); }
async function main(sampleFile, rawRoot) {
  const text = fs.readFileSync(sampleFile, "utf8"), sample = JSON.parse(text);
  if (sample.status !== "frozen-before-model-output" || !Array.isArray(sample.cases) || sample.cases.length !== 8) throw new Error("invalid v2 frozen sample");
  fs.mkdirSync(rawRoot, { recursive: true, mode: 0o700 });
  write(path.join(rawRoot, "provenance.json"), { status: "development-diagnostic-not-cdr-receipt", sample_sha256: sha256(text), model: "gpt-5.6-luna", conditions: ["plain", "declared"], model_calls_per_case: 3, started_at: new Date().toISOString() });
  const rows = [];
  for (const item of sample.cases) {
    const dir = path.join(rawRoot, item.case_id);
    const formal = await invoke({ prompt: formalPrompt(item), schema: FORM_SCHEMA, directory: path.join(dir, "formalization"), label: "v2-formalization" });
    let plain = null, declared = null, traces = null;
    if (!formal.error && formal.output) {
      plain = await invoke({ prompt: plainPrompt(item, formal.output), schema: PLAIN_SCHEMA, directory: path.join(dir, "plain"), label: "v2-plain" });
      declared = await invoke({ prompt: declaredPrompt(item, formal.output), schema: DECLARED_SCHEMA, directory: path.join(dir, "declared"), label: "v2-declared" });
      traces = { plain: await trace(item, formal.output, plain), declared: await trace(item, formal.output, declared) };
    }
    const record = { case_id: item.case_id, source_id: item.source_id, expected_class: item.expected_class, target_sentence_id: item.target_sentence_id, formalization: formal, plain, declared, traces };
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 }); write(path.join(dir, "record.json"), record); rows.push(record);
    console.log(JSON.stringify({ case_id: item.case_id, formalization_error: formal.error, plain: traces && traces.plain.conclusion, declared: traces && traces.declared.conclusion }));
  }
  write(path.join(rawRoot, "aggregate-not-a-cdr-receipt.json"), { status: "completed-development-diagnostic", rows: rows.map(row => ({ case_id: row.case_id, expected_class: row.expected_class, plain: row.traces && row.traces.plain.conclusion, declared: row.traces && row.traces.declared.conclusion, assessment: row.declared && row.declared.output && row.declared.output.assessment })) });
}
if (require.main === module) main(process.argv[2], process.argv[3]).catch(error => { console.error(error.stack || error); process.exitCode = 1; });
module.exports = { asV1, declaredPrompt, formalPrompt, plainPrompt };
