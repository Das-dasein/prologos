"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { EvidenceExtraction, ADMISSION_EXTRACTION_INSTRUCTIONS, createMemoryExtractionJsonSchema } = require("./llm-schema");
const { ACTIVE_ONTOLOGY, canonicalJson } = require("./ontology-registry");
const { inspectExtractionCandidateV2 } = require("./extraction-admission");

const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const buildPrompt = sourceText => `${ADMISSION_EXTRACTION_INSTRUCTIONS}\n\nUSER MESSAGE:\n${sourceText}\n\nReturn only the schema-conforming result. Do not use tools.`;
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
  if (fixture.length !== 12 || gold.length !== 12) throw new Error("control requires 12 cases");
  fixture.forEach((row, index) => {
    exact(row, ["case_id", "source_text"], `fixture[${index}]`);
    if (!/^coref-[0-9]{2}$/.test(row.case_id) || typeof row.source_text !== "string" || !row.source_text) throw new Error("invalid fixture row");
  });
  gold.forEach((row, index) => {
    exact(row, ["case_id", "expected_action", "assertions"], `gold[${index}]`);
    if (!fixture[index] || fixture[index].case_id !== row.case_id || !["write", "clarify", "no_write"].includes(row.expected_action) || !Array.isArray(row.assertions)) throw new Error("gold binding mismatch");
    if ((row.expected_action === "write") !== (row.assertions.length > 0)) throw new Error("gold action/assertion mismatch");
    row.assertions.forEach(assertion => {
      exact(assertion, ["polarity", "relation", "arguments", "valid_from", "valid_to"], "gold assertion");
      if (!ACTIVE_ONTOLOGY.predicates[assertion.relation] || assertion.arguments.length !== ACTIVE_ONTOLOGY.predicates[assertion.relation].arity) throw new Error("gold predicate mismatch");
    });
  });
  if (new Set(fixture.map(row => row.case_id)).size !== 12) throw new Error("duplicate control case");
  return { fixture, gold, fixture_sha256: sha256(fixtureText), gold_sha256: sha256(goldText) };
}

const projection = assertion => ({ polarity: assertion.polarity, relation: assertion.relation, arguments: assertion.arguments, valid_from: assertion.valid_from, valid_to: assertion.valid_to });
const keys = assertions => assertions.map(assertion => canonicalJson(projection(assertion))).sort();

function scoreCase(source, expected, candidate) {
  const diagnostics = inspectExtractionCandidateV2(candidate, source.source_text);
  const semanticExact = canonicalJson(keys(candidate.assertions)) === canonicalJson(keys(expected.assertions)) && candidate.ontology_candidates.length === 0;
  const actualWrite = candidate.assertions.length > 0;
  const expectedWrite = expected.expected_action === "write";
  return {
    case_id: source.case_id,
    expected_action: expected.expected_action,
    actual_write: actualWrite,
    write_boundary_correct: actualWrite === expectedWrite,
    semantic_exact: semanticExact,
    validator_v2_eligible: diagnostics.length === 0,
    validator_v2_diagnostics: diagnostics,
    harmful_write_eligible: actualWrite && !semanticExact && diagnostics.length === 0,
    correct_write_blocked: expectedWrite && semanticExact && diagnostics.length > 0,
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
  return {
    cases: scores.length,
    write_boundary_accuracy: ratio(row => row.write_boundary_correct),
    semantic_case_exact: ratio(row => row.semantic_exact),
    validator_v2_eligible: ratio(row => row.validator_v2_eligible),
    harmful_writes_eligible: scores.filter(row => row.harmful_write_eligible).length,
    correct_writes_blocked: scores.filter(row => row.correct_write_blocked).length,
    clarify_cases_with_write: scores.filter(row => row.expected_action === "clarify" && row.actual_write).length,
    ontology_candidates: scores.reduce((total, row) => total + row.ontology_candidates, 0),
  };
}

function verifyReport(report, control) {
  if (!report || report.schema_version !== "product-extraction-v3-validator-control-v1" || report.status !== "complete-unadmitted-v1") throw new Error("control report identity mismatch");
  if (report.fixture_sha256 !== control.fixture_sha256 || report.gold_sha256 !== control.gold_sha256 || report.records.length !== 12 || report.provider_calls !== 12 || report.admission_writes !== 0) throw new Error("control report binding mismatch");
  const scores = report.records.map((record, index) => {
    if (record.case_id !== control.fixture[index].case_id || record.source_sha256 !== sha256(control.fixture[index].source_text) || record.prompt_sha256 !== sha256(buildPrompt(control.fixture[index].source_text))) throw new Error("record binding mismatch");
    const candidate = EvidenceExtraction.parse(record.candidate);
    if (record.candidate_sha256 !== sha256(canonicalJson(candidate))) throw new Error("candidate hash mismatch");
    if (!record.usage || !["input_tokens", "cached_input_tokens", "output_tokens"].every(key => Number.isInteger(record.usage[key]) && record.usage[key] >= 0)) throw new Error("usage mismatch");
    return scoreCase(control.fixture[index], control.gold[index], candidate);
  });
  if (canonicalJson(scores) !== canonicalJson(report.scores) || canonicalJson(summary(scores)) !== canonicalJson(report.summary)) throw new Error("control score replay mismatch");
  return { status: "verified-product-extraction-v3-validator-control-v1", summary: report.summary };
}

const artifact = (root, file) => ({ path: path.relative(root, file), sha256: sha256(fs.readFileSync(file)), bytes: fs.statSync(file).size });

async function collect({ fixtureFile, goldFile, model, outputRoot, invoke }) {
  if (!model || process.env.CODEX_MODEL !== model) throw new Error("model must equal explicit CODEX_MODEL");
  if (fs.existsSync(outputRoot)) throw new Error("output root already exists");
  const control = loadControl(fixtureFile, goldFile);
  const schema = createMemoryExtractionJsonSchema(ACTIVE_ONTOLOGY, { schemaVersion: "memory-extraction-v3", assertionEvidence: true });
  const schemaFile = path.resolve("schemas/memory-extraction-v3.schema.json");
  const provider = invoke || require("./providers/codex").runCodexEvidence;
  fs.mkdirSync(outputRoot, { recursive: true, mode: 0o700 });
  const records = [];
  for (const [index, source] of control.fixture.entries()) {
    const prompt = buildPrompt(source.source_text);
    const rawRoot = path.join(outputRoot, "raw", source.case_id);
    fs.mkdirSync(rawRoot, { recursive: true, mode: 0o700 });
    const promptFile = path.join(rawRoot, "prompt.txt");
    fs.writeFileSync(promptFile, prompt, { flag: "wx", mode: 0o600 });
    let response;
    try {
      response = await provider(prompt, { schema: schemaFile, model });
    } catch (error) {
      if (error.stdout) fs.writeFileSync(path.join(rawRoot, "stdout.jsonl"), error.stdout, { flag: "wx", mode: 0o600 });
      if (error.stderr) fs.writeFileSync(path.join(rawRoot, "stderr.txt"), error.stderr, { flag: "wx", mode: 0o600 });
      fs.writeFileSync(path.join(outputRoot, "failure.json"), `${JSON.stringify({ status: "terminal-partial-run", failed_index: index, case_id: source.case_id, completed_calls: records.length, error: error.message }, null, 2)}\n`, { flag: "wx", mode: 0o600 });
      throw error;
    }
    const stdoutFile = path.join(rawRoot, "stdout.jsonl");
    const stderrFile = path.join(rawRoot, "stderr.txt");
    fs.writeFileSync(stdoutFile, response.stdout, { flag: "wx", mode: 0o600 });
    fs.writeFileSync(stderrFile, response.stderr, { flag: "wx", mode: 0o600 });
    const candidate = EvidenceExtraction.parse(JSON.parse(response.output_text));
    records.push({ case_id: source.case_id, source_sha256: sha256(source.source_text), prompt_sha256: sha256(prompt), candidate, candidate_sha256: sha256(canonicalJson(candidate)), usage: response.usage, raw: { prompt: artifact(outputRoot, promptFile), stdout: artifact(outputRoot, stdoutFile), stderr: artifact(outputRoot, stderrFile) } });
  }
  const scores = records.map((record, index) => scoreCase(control.fixture[index], control.gold[index], record.candidate));
  const report = { schema_version: "product-extraction-v3-validator-control-v1", status: "complete-unadmitted-v1", provider: "codex", model, fixture_sha256: control.fixture_sha256, gold_sha256: control.gold_sha256, schema_sha256: sha256(canonicalJson(schema)), prompt_contract_sha256: sha256(ADMISSION_EXTRACTION_INSTRUCTIONS), provider_calls: records.length, admission_writes: 0, records, scores, summary: summary(scores) };
  verifyReport(report, control);
  fs.writeFileSync(path.join(outputRoot, "report.json"), `${JSON.stringify(report, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  return report;
}

function parseArgs(argv) {
  const parsed = { allowLiveProvider: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--allow-live-provider") parsed.allowLiveProvider = true;
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
  const report = await collect({ fixtureFile: path.resolve(args.fixture), goldFile: path.resolve(args.gold), model: args.model, outputRoot: path.resolve(args.output_root) });
  process.stdout.write(`${JSON.stringify({ status: report.status, summary: report.summary })}\n`);
})().catch(error => { console.error(error.message); process.exitCode = 1; });
