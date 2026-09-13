"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { PolicyDecisionExtraction, POLICY_DECISION_EXTRACTION_INSTRUCTIONS, createMemoryExtractionJsonSchema } = require("./llm-schema");
const { ACTIVE_ONTOLOGY, canonicalJson } = require("./ontology-registry");
const { ACTIVE_GROUNDING_POLICY } = require("./predicate-grounding-policy");
const { inspectExtractionCandidateV2PolicyIdentity } = require("./extraction-admission");

const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const buildPrompt = sourceText => `${POLICY_DECISION_EXTRACTION_INSTRUCTIONS}\n\nUSER MESSAGE:\n${sourceText}\n\nReturn only the schema-conforming result. Do not use tools.`;
const readJsonl = file => fs.readFileSync(file, "utf8").trim().split(/\r?\n/).map(JSON.parse);

function exact(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  if (canonicalJson(Object.keys(value).sort()) !== canonicalJson([...keys].sort())) throw new Error(`${label} shape mismatch`);
}

function loadControl(fixtureFile, goldFile) {
  const fixtureText = fs.readFileSync(fixtureFile, "utf8");
  const goldText = fs.readFileSync(goldFile, "utf8");
  const fixture = readJsonl(fixtureFile);
  const gold = readJsonl(goldFile);
  if (fixture.length !== 16 || gold.length !== 16) throw new Error("v5 identity control requires 16 cases");
  fixture.forEach((row, index) => {
    exact(row, ["case_id", "category", "source_text", "ontology_identity", "policy_identity"], `fixture[${index}]`);
    if (!/^id-[0-9]{2}$/.test(row.case_id) || typeof row.source_text !== "string" || !row.source_text) throw new Error("invalid fixture row");
    if (canonicalJson(row.ontology_identity) !== canonicalJson(ACTIVE_ONTOLOGY.identity) || canonicalJson(row.policy_identity) !== canonicalJson(ACTIVE_GROUNDING_POLICY.identity)) throw new Error("identity control policy binding mismatch");
  });
  gold.forEach((row, index) => {
    exact(row, ["case_id", "category", "expected_decision", "assertions"], `gold[${index}]`);
    if (!fixture[index] || fixture[index].case_id !== row.case_id || fixture[index].category !== row.category || !["write", "ignore", "clarify", "ontology_candidate"].includes(row.expected_decision) || !Array.isArray(row.assertions)) throw new Error("gold binding mismatch");
    if ((row.expected_decision === "write") !== (row.assertions.length > 0)) throw new Error("gold decision/assertion mismatch");
    row.assertions.forEach(assertion => {
      exact(assertion, ["polarity", "relation", "arguments", "valid_from", "valid_to"], "gold assertion");
      if (!ACTIVE_ONTOLOGY.predicates[assertion.relation] || assertion.arguments.length !== ACTIVE_ONTOLOGY.predicates[assertion.relation].arity) throw new Error("gold predicate mismatch");
    });
  });
  if (new Set(fixture.map(row => row.case_id)).size !== 16) throw new Error("duplicate control case");
  const decisions = gold.reduce((counts, row) => ({ ...counts, [row.expected_decision]: (counts[row.expected_decision] || 0) + 1 }), {});
  if (decisions.write !== 10 || decisions.clarify !== 6) throw new Error("identity gold balance mismatch");
  return { fixture, gold, fixture_sha256: sha256(fixtureText), gold_sha256: sha256(goldText) };
}

const projection = assertion => ({ polarity: assertion.polarity, relation: assertion.relation, arguments: assertion.arguments, valid_from: assertion.valid_from, valid_to: assertion.valid_to });
const keys = assertions => assertions.map(assertion => canonicalJson(projection(assertion))).sort();

function scoreCase(source, expected, candidate) {
  const { policy_identity: ignored, ...candidateBody } = candidate;
  const diagnostics = inspectExtractionCandidateV2PolicyIdentity({ ...candidateBody, schema_version: "memory-extraction-v4" }, source.source_text);
  const assertionExact = canonicalJson(keys(candidate.assertions)) === canonicalJson(keys(expected.assertions));
  const expectedWrite = expected.expected_decision === "write";
  const actualWrite = candidate.decision === "write";
  const finalGateEligible = actualWrite && diagnostics.length === 0;
  const payloadExact = expectedWrite ? candidate.ontology_candidates.length === 0 : candidate.assertions.length === 0;
  const semanticExact = candidate.decision === expected.expected_decision && assertionExact && payloadExact;
  return {
    case_id: source.case_id,
    expected_decision: expected.expected_decision,
    actual_decision: candidate.decision,
    decision_correct: candidate.decision === expected.expected_decision,
    actual_write: actualWrite,
    write_boundary_correct: actualWrite === expectedWrite,
    semantic_exact: semanticExact,
    policy_identity_gate_eligible: diagnostics.length === 0,
    policy_identity_gate_diagnostics: diagnostics,
    final_gate_eligible: finalGateEligible,
    final_gate_correct: finalGateEligible === expectedWrite,
    harmful_write_eligible: actualWrite && !semanticExact && diagnostics.length === 0,
    correct_write_blocked: expectedWrite && semanticExact && diagnostics.length > 0,
    expected_write_overclarified: expectedWrite && candidate.decision === "clarify",
    expected_clarify_written: expected.expected_decision === "clarify" && actualWrite,
    expected_assertions: expected.assertions.length,
    predicted_assertions: candidate.assertions.length,
    ontology_candidates: candidate.ontology_candidates.length,
  };
}

function summary(scores) {
  const ratio = (predicate, denominator = scores.length) => {
    const numerator = scores.filter(predicate).length;
    return { numerator, denominator, rate: denominator ? numerator / denominator : null };
  };
  const confusion = {};
  for (const row of scores) {
    const key = `${row.expected_decision}->${row.actual_decision}`;
    confusion[key] = (confusion[key] || 0) + 1;
  }
  return {
    cases: scores.length,
    decision_accuracy: ratio(row => row.decision_correct),
    write_boundary_accuracy: ratio(row => row.write_boundary_correct),
    semantic_case_exact: ratio(row => row.semantic_exact),
    policy_identity_gate_eligible: ratio(row => row.policy_identity_gate_eligible),
    final_gate_accuracy: ratio(row => row.final_gate_correct),
    harmful_writes_eligible: scores.filter(row => row.harmful_write_eligible).length,
    correct_writes_blocked: scores.filter(row => row.correct_write_blocked).length,
    expected_writes_overclarified: scores.filter(row => row.expected_write_overclarified).length,
    clarify_cases_with_write: scores.filter(row => row.expected_clarify_written).length,
    ontology_candidates: scores.reduce((total, row) => total + row.ontology_candidates, 0),
    confusion,
  };
}

function verifyReport(report, control) {
  if (!report || report.schema_version !== "product-extraction-v5-identity-control-report-v1" || report.status !== "complete-unadmitted-v1") throw new Error("control report identity mismatch");
  if (report.fixture_sha256 !== control.fixture_sha256 || report.gold_sha256 !== control.gold_sha256 || canonicalJson(report.policy_identity) !== canonicalJson(ACTIVE_GROUNDING_POLICY.identity) || report.records.length !== 16 || report.provider_calls !== 16 || report.admission_writes !== 0) throw new Error("control report binding mismatch");
  const scores = report.records.map((record, index) => {
    if (record.case_id !== control.fixture[index].case_id || record.source_sha256 !== sha256(control.fixture[index].source_text) || record.prompt_sha256 !== sha256(buildPrompt(control.fixture[index].source_text))) throw new Error("record binding mismatch");
    const candidate = PolicyDecisionExtraction.parse(record.candidate);
    if (record.candidate_sha256 !== sha256(canonicalJson(candidate))) throw new Error("candidate hash mismatch");
    if (!record.usage || !["input_tokens", "cached_input_tokens", "output_tokens"].every(key => Number.isInteger(record.usage[key]) && record.usage[key] >= 0)) throw new Error("usage mismatch");
    return scoreCase(control.fixture[index], control.gold[index], candidate);
  });
  if (canonicalJson(scores) !== canonicalJson(report.scores) || canonicalJson(summary(scores)) !== canonicalJson(report.summary)) throw new Error("control score replay mismatch");
  return { status: "verified-product-extraction-v5-identity-control-v1", summary: report.summary };
}

const artifact = (root, file) => ({ path: path.relative(root, file), sha256: sha256(fs.readFileSync(file)), bytes: fs.statSync(file).size });

async function collect({ fixtureFile, goldFile, model, outputRoot, invoke, resume = false }) {
  if (!model || process.env.CODEX_MODEL !== model) throw new Error("model must equal explicit CODEX_MODEL");
  if (fs.existsSync(outputRoot) && !resume) throw new Error("output root already exists");
  const control = loadControl(fixtureFile, goldFile);
  const schema = createMemoryExtractionJsonSchema(ACTIVE_ONTOLOGY, { schemaVersion: "memory-extraction-v5", assertionEvidence: true, decisionContract: true, groundingPolicy: ACTIVE_GROUNDING_POLICY });
  const schemaFile = path.resolve("schemas/memory-extraction-v5.schema.json");
  const provider = invoke || require("./providers/codex").runCodexEvidence;
  fs.mkdirSync(outputRoot, { recursive: true, mode: 0o700 });
  const recordsFile = path.join(outputRoot, "records.jsonl");
  const records = resume && fs.existsSync(recordsFile) ? readJsonl(recordsFile) : [];
  records.forEach((record, index) => {
    const source = control.fixture[index];
    if (!source || record.case_id !== source.case_id || record.prompt_sha256 !== sha256(buildPrompt(source.source_text))) throw new Error("identity resume binding mismatch");
    PolicyDecisionExtraction.parse(record.candidate);
  });
  for (let index = records.length; index < control.fixture.length; index += 1) {
    const source = control.fixture[index];
    const prompt = buildPrompt(source.source_text);
    const rawRoot = path.join(outputRoot, "raw", source.case_id);
    const inflightRoot = path.join(outputRoot, "raw", `.inflight-${source.case_id}`);
    if (fs.existsSync(inflightRoot)) fs.renameSync(inflightRoot, path.join(outputRoot, "raw", `.failed-${source.case_id}-${Date.now()}`));
    fs.mkdirSync(inflightRoot, { recursive: true, mode: 0o700 });
    const promptFile = path.join(inflightRoot, "prompt.txt");
    fs.writeFileSync(promptFile, prompt, { flag: "wx", mode: 0o600 });
    let response;
    try {
      response = await provider(prompt, { schema: schemaFile, model });
    } catch (error) {
      if (error.stdout) fs.writeFileSync(path.join(inflightRoot, "stdout.jsonl"), error.stdout, { flag: "wx", mode: 0o600 });
      if (error.stderr) fs.writeFileSync(path.join(inflightRoot, "stderr.txt"), error.stderr, { flag: "wx", mode: 0o600 });
      fs.writeFileSync(path.join(outputRoot, "failure.json"), `${JSON.stringify({ status: "terminal-partial-run", failed_index: index, case_id: source.case_id, completed_calls: records.length, error: error.message }, null, 2)}\n`, { mode: 0o600 });
      throw error;
    }
    const stdoutFile = path.join(inflightRoot, "stdout.jsonl");
    const stderrFile = path.join(inflightRoot, "stderr.txt");
    fs.writeFileSync(stdoutFile, response.stdout, { flag: "wx", mode: 0o600 });
    fs.writeFileSync(stderrFile, response.stderr, { flag: "wx", mode: 0o600 });
    const candidate = PolicyDecisionExtraction.parse(JSON.parse(response.output_text));
    fs.renameSync(inflightRoot, rawRoot);
    const record = { case_id: source.case_id, source_sha256: sha256(source.source_text), prompt_sha256: sha256(prompt), candidate, candidate_sha256: sha256(canonicalJson(candidate)), usage: response.usage, raw: { prompt: artifact(outputRoot, path.join(rawRoot, "prompt.txt")), stdout: artifact(outputRoot, path.join(rawRoot, "stdout.jsonl")), stderr: artifact(outputRoot, path.join(rawRoot, "stderr.txt")) } };
    records.push(record);
    fs.appendFileSync(recordsFile, `${JSON.stringify(record)}\n`, { mode: 0o600 });
  }
  const scores = records.map((record, index) => scoreCase(control.fixture[index], control.gold[index], record.candidate));
  const report = { schema_version: "product-extraction-v5-identity-control-report-v1", status: "complete-unadmitted-v1", provider: "codex", model, policy_identity: ACTIVE_GROUNDING_POLICY.identity, fixture_sha256: control.fixture_sha256, gold_sha256: control.gold_sha256, schema_sha256: sha256(canonicalJson(schema)), prompt_contract_sha256: sha256(POLICY_DECISION_EXTRACTION_INSTRUCTIONS), provider_calls: records.length, admission_writes: 0, records, scores, summary: summary(scores) };
  verifyReport(report, control);
  fs.writeFileSync(path.join(outputRoot, "report.json"), `${JSON.stringify(report, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  return report;
}

function parseArgs(argv) {
  const parsed = { allowLiveProvider: false, resumeAfterUserInterrupt: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--allow-live-provider") parsed.allowLiveProvider = true;
    else if (token === "--resume-after-user-interrupt") parsed.resumeAfterUserInterrupt = true;
    else if (["--fixture", "--gold", "--model", "--output-root"].includes(token)) parsed[token.slice(2).replaceAll("-", "_")] = argv[++index];
    else throw new Error(`unknown argument: ${token}`);
  }
  return parsed;
}

module.exports = { buildPrompt, collect, loadControl, scoreCase, summary, verifyReport };

if (require.main === module) (async () => {
  const args = parseArgs(process.argv.slice(2));
  if (!args.allowLiveProvider) return process.stdout.write(`${JSON.stringify({ status: "offline-no-default-provider", provider_calls: 0, admission_writes: 0 })}\n`);
  if (!args.fixture || !args.gold || !args.model || !args.output_root) throw new Error("live gates are incomplete");
  const report = await collect({ fixtureFile: path.resolve(args.fixture), goldFile: path.resolve(args.gold), model: args.model, outputRoot: path.resolve(args.output_root), resume: args.resumeAfterUserInterrupt });
  process.stdout.write(`${JSON.stringify({ status: report.status, summary: report.summary })}\n`);
})().catch(error => { console.error(error.message); process.exitCode = 1; });
