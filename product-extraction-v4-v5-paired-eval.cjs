"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const {
  DecisionExtraction,
  PolicyDecisionExtraction,
  DECISION_EXTRACTION_INSTRUCTIONS,
  POLICY_DECISION_EXTRACTION_INSTRUCTIONS,
  createMemoryExtractionJsonSchema,
} = require("./llm-schema");
const { ACTIVE_ONTOLOGY, canonicalJson } = require("./ontology-registry");
const { ACTIVE_GROUNDING_POLICY } = require("./predicate-grounding-policy");
const { inspectExtractionCandidateV2 } = require("./extraction-admission");

const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const readJsonl = file => fs.readFileSync(file, "utf8").trim().split(/\r?\n/).map(JSON.parse);
const artifact = (root, file) => ({ path: path.relative(root, file), sha256: sha256(fs.readFileSync(file)), bytes: fs.statSync(file).size });
const conditions = {
  v4: {
    schemaVersion: "memory-extraction-v4",
    parser: DecisionExtraction,
    instructions: DECISION_EXTRACTION_INSTRUCTIONS,
    schemaFile: "schemas/memory-extraction-v4.schema.json",
  },
  v5: {
    schemaVersion: "memory-extraction-v5",
    parser: PolicyDecisionExtraction,
    instructions: POLICY_DECISION_EXTRACTION_INSTRUCTIONS,
    schemaFile: "schemas/memory-extraction-v5.schema.json",
  },
};

function exact(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  if (canonicalJson(Object.keys(value).sort()) !== canonicalJson([...keys].sort())) throw new Error(`${label} shape mismatch`);
}

function buildPrompt(condition, sourceText) {
  const config = conditions[condition];
  if (!config) throw new Error("unknown extraction condition");
  return `${config.instructions}\n\nUSER MESSAGE:\n${sourceText}\n\nReturn only the schema-conforming result. Do not use tools.`;
}

function loadControl(fixtureFile, goldFile) {
  const fixtureText = fs.readFileSync(fixtureFile, "utf8");
  const goldText = fs.readFileSync(goldFile, "utf8");
  const fixture = readJsonl(fixtureFile);
  const gold = readJsonl(goldFile);
  if (fixture.length !== 20 || gold.length !== 20) throw new Error("paired control requires 20 cases");
  fixture.forEach((row, index) => {
    exact(row, ["case_id", "category", "source_text", "condition_order", "ontology_identity", "policy_identity"], `fixture[${index}]`);
    if (row.case_id !== `pv-${String(index + 1).padStart(2, "0")}` || !row.source_text || canonicalJson(row.condition_order) !== canonicalJson(index % 2 === 0 ? ["v4", "v5"] : ["v5", "v4"])) throw new Error("invalid paired fixture row");
    if (canonicalJson(row.ontology_identity) !== canonicalJson(ACTIVE_ONTOLOGY.identity) || canonicalJson(row.policy_identity) !== canonicalJson(ACTIVE_GROUNDING_POLICY.identity)) throw new Error("paired fixture identity mismatch");
    const expected = gold[index];
    exact(expected, ["case_id", "category", "expected_decision", "assertions"], `gold[${index}]`);
    if (expected.case_id !== row.case_id || expected.category !== row.category || !["write", "ignore", "clarify"].includes(expected.expected_decision) || !Array.isArray(expected.assertions)) throw new Error("paired gold binding mismatch");
    if ((expected.expected_decision === "write") !== (expected.assertions.length > 0)) throw new Error("paired gold decision mismatch");
    expected.assertions.forEach(item => {
      exact(item, ["polarity", "relation", "arguments", "valid_from", "valid_to"], "paired gold assertion");
      if (!ACTIVE_ONTOLOGY.predicates[item.relation] || item.arguments.length !== ACTIVE_ONTOLOGY.predicates[item.relation].arity) throw new Error("paired gold predicate mismatch");
    });
  });
  const decisions = gold.reduce((counts, row) => ({ ...counts, [row.expected_decision]: (counts[row.expected_decision] || 0) + 1 }), {});
  if (decisions.write !== 11 || decisions.ignore !== 8 || decisions.clarify !== 1) throw new Error("paired gold balance mismatch");
  return { fixture, gold, fixture_sha256: sha256(fixtureText), gold_sha256: sha256(goldText) };
}

const projection = assertion => ({ polarity: assertion.polarity, relation: assertion.relation, arguments: assertion.arguments, valid_from: assertion.valid_from, valid_to: assertion.valid_to });
const assertionKeys = assertions => assertions.map(item => canonicalJson(projection(item))).sort();
function validatorProjection(candidate) {
  if (candidate.schema_version === "memory-extraction-v4") return candidate;
  const { policy_identity: ignored, ...projected } = candidate;
  return { ...projected, schema_version: "memory-extraction-v4" };
}

function scoreCase(source, expected, condition, candidate) {
  const diagnostics = inspectExtractionCandidateV2(validatorProjection(candidate), source.source_text);
  const assertionExact = canonicalJson(assertionKeys(candidate.assertions)) === canonicalJson(assertionKeys(expected.assertions));
  const expectedWrite = expected.expected_decision === "write";
  const actualWrite = candidate.decision === "write";
  const semanticExact = candidate.decision === expected.expected_decision && assertionExact && candidate.ontology_candidates.length === 0;
  return {
    case_id: source.case_id,
    category: source.category,
    condition,
    expected_decision: expected.expected_decision,
    actual_decision: candidate.decision,
    decision_correct: candidate.decision === expected.expected_decision,
    write_boundary_correct: actualWrite === expectedWrite,
    semantic_exact: semanticExact,
    harmful_write: actualWrite && !semanticExact,
    validator_v2_projection_eligible: diagnostics.length === 0,
    harmful_write_projection_eligible: actualWrite && !semanticExact && diagnostics.length === 0,
    correct_write_projection_blocked: expectedWrite && semanticExact && diagnostics.length > 0,
    validator_v2_projection_diagnostics: diagnostics,
  };
}

function conditionSummary(scores) {
  const ratio = predicate => ({ numerator: scores.filter(predicate).length, denominator: scores.length, rate: scores.filter(predicate).length / scores.length });
  return {
    cases: scores.length,
    decision_accuracy: ratio(row => row.decision_correct),
    write_boundary_accuracy: ratio(row => row.write_boundary_correct),
    semantic_case_exact: ratio(row => row.semantic_exact),
    harmful_writes: scores.filter(row => row.harmful_write).length,
    harmful_writes_projection_eligible: scores.filter(row => row.harmful_write_projection_eligible).length,
    correct_writes_projection_blocked: scores.filter(row => row.correct_write_projection_blocked).length,
    confusion: scores.reduce((counts, row) => ({ ...counts, [`${row.expected_decision}->${row.actual_decision}`]: (counts[`${row.expected_decision}->${row.actual_decision}`] || 0) + 1 }), {}),
  };
}

function summary(scores) {
  const v4 = scores.filter(row => row.condition === "v4");
  const v5 = scores.filter(row => row.condition === "v5");
  const paired = v4.map(left => ({ left, right: v5.find(right => right.case_id === left.case_id) }));
  return {
    v4: conditionSummary(v4),
    v5: conditionSummary(v5),
    paired_semantic_transitions: {
      v4_wrong_v5_right: paired.filter(({ left, right }) => !left.semantic_exact && right.semantic_exact).map(({ left }) => left.case_id),
      v4_right_v5_wrong: paired.filter(({ left, right }) => left.semantic_exact && !right.semantic_exact).map(({ left }) => left.case_id),
      both_wrong: paired.filter(({ left, right }) => !left.semantic_exact && !right.semantic_exact).map(({ left }) => left.case_id),
    },
  };
}

function expectedRecordOrder(control) {
  return control.fixture.flatMap(row => row.condition_order.map(condition => ({ case_id: row.case_id, condition })));
}

function verifyReport(report, control) {
  if (!report || report.schema_version !== "product-extraction-v4-v5-paired-report-v1" || report.status !== "complete-unadmitted-v1") throw new Error("paired report identity mismatch");
  if (report.fixture_sha256 !== control.fixture_sha256 || report.gold_sha256 !== control.gold_sha256 || canonicalJson(report.ontology_identity) !== canonicalJson(ACTIVE_ONTOLOGY.identity) || canonicalJson(report.policy_identity) !== canonicalJson(ACTIVE_GROUNDING_POLICY.identity) || report.provider_calls !== 40 || report.admission_writes !== 0 || report.records.length !== 40) throw new Error("paired report binding mismatch");
  const order = expectedRecordOrder(control);
  const scores = report.records.map((record, index) => {
    const expectedRecord = order[index];
    const caseIndex = control.fixture.findIndex(row => row.case_id === expectedRecord.case_id);
    const source = control.fixture[caseIndex];
    if (record.case_id !== expectedRecord.case_id || record.condition !== expectedRecord.condition || record.source_sha256 !== sha256(source.source_text) || record.prompt_sha256 !== sha256(buildPrompt(record.condition, source.source_text))) throw new Error("paired record binding mismatch");
    const candidate = conditions[record.condition].parser.parse(record.candidate);
    if (record.candidate_sha256 !== sha256(canonicalJson(candidate))) throw new Error("paired candidate hash mismatch");
    if (!record.usage || !["input_tokens", "cached_input_tokens", "output_tokens"].every(key => Number.isInteger(record.usage[key]) && record.usage[key] >= 0)) throw new Error("paired usage mismatch");
    return scoreCase(source, control.gold[caseIndex], record.condition, candidate);
  });
  if (canonicalJson(scores) !== canonicalJson(report.scores) || canonicalJson(summary(scores)) !== canonicalJson(report.summary)) throw new Error("paired score replay mismatch");
  return { status: "verified-product-extraction-v4-v5-paired-v1", summary: report.summary };
}

async function collect({ fixtureFile, goldFile, model, outputRoot, invoke, resume = false }) {
  if (!model || process.env.CODEX_MODEL !== model) throw new Error("model must equal explicit CODEX_MODEL");
  if (fs.existsSync(outputRoot) && !resume) throw new Error("output root already exists");
  const control = loadControl(fixtureFile, goldFile);
  const provider = invoke || require("./providers/codex").runCodexEvidence;
  const order = expectedRecordOrder(control);
  fs.mkdirSync(outputRoot, { recursive: true, mode: 0o700 });
  const recordsFile = path.join(outputRoot, "records.jsonl");
  const records = resume && fs.existsSync(recordsFile) ? readJsonl(recordsFile) : [];
  records.forEach((record, index) => {
    const expected = order[index];
    if (!expected || record.case_id !== expected.case_id || record.condition !== expected.condition) throw new Error("paired resume order mismatch");
  });
  for (let index = records.length; index < order.length; index += 1) {
    const current = order[index];
    const caseIndex = control.fixture.findIndex(row => row.case_id === current.case_id);
    const source = control.fixture[caseIndex];
    const config = conditions[current.condition];
    const prompt = buildPrompt(current.condition, source.source_text);
    const finalRoot = path.join(outputRoot, "raw", source.case_id, current.condition);
    const inflightRoot = path.join(outputRoot, "raw", `.inflight-${source.case_id}-${current.condition}`);
    if (fs.existsSync(inflightRoot)) fs.renameSync(inflightRoot, path.join(outputRoot, "raw", `.failed-${source.case_id}-${current.condition}-${Date.now()}`));
    fs.mkdirSync(inflightRoot, { recursive: true, mode: 0o700 });
    const promptFile = path.join(inflightRoot, "prompt.txt");
    fs.writeFileSync(promptFile, prompt, { flag: "wx", mode: 0o600 });
    let response;
    try { response = await provider(prompt, { schema: path.resolve(config.schemaFile), model }); }
    catch (error) {
      if (error.stdout) fs.writeFileSync(path.join(inflightRoot, "stdout.jsonl"), error.stdout, { flag: "wx", mode: 0o600 });
      if (error.stderr) fs.writeFileSync(path.join(inflightRoot, "stderr.txt"), error.stderr, { flag: "wx", mode: 0o600 });
      fs.writeFileSync(path.join(outputRoot, "failure.json"), `${JSON.stringify({ status: "terminal-partial-run", failed_index: index, ...current, completed_calls: records.length, error: error.message }, null, 2)}\n`, { mode: 0o600 });
      throw error;
    }
    fs.writeFileSync(path.join(inflightRoot, "stdout.jsonl"), response.stdout, { flag: "wx", mode: 0o600 });
    fs.writeFileSync(path.join(inflightRoot, "stderr.txt"), response.stderr, { flag: "wx", mode: 0o600 });
    const candidate = config.parser.parse(JSON.parse(response.output_text));
    fs.mkdirSync(path.dirname(finalRoot), { recursive: true, mode: 0o700 });
    fs.renameSync(inflightRoot, finalRoot);
    const record = {
      ...current,
      source_sha256: sha256(source.source_text),
      prompt_sha256: sha256(prompt),
      candidate,
      candidate_sha256: sha256(canonicalJson(candidate)),
      usage: response.usage,
      raw: Object.fromEntries(["prompt.txt", "stdout.jsonl", "stderr.txt"].map(name => [name.split(".")[0], artifact(outputRoot, path.join(finalRoot, name))])),
    };
    records.push(record);
    fs.appendFileSync(recordsFile, `${JSON.stringify(record)}\n`, { mode: 0o600 });
  }
  const scores = records.map(record => {
    const caseIndex = control.fixture.findIndex(row => row.case_id === record.case_id);
    return scoreCase(control.fixture[caseIndex], control.gold[caseIndex], record.condition, record.candidate);
  });
  const schemaHashes = Object.fromEntries(Object.entries(conditions).map(([name, config]) => [name, sha256(canonicalJson(createMemoryExtractionJsonSchema(ACTIVE_ONTOLOGY, {
    schemaVersion: config.schemaVersion,
    assertionEvidence: true,
    decisionContract: true,
    ...(name === "v5" ? { groundingPolicy: ACTIVE_GROUNDING_POLICY } : {}),
  })))]));
  const report = {
    schema_version: "product-extraction-v4-v5-paired-report-v1",
    status: "complete-unadmitted-v1",
    provider: "codex",
    model,
    ontology_identity: ACTIVE_ONTOLOGY.identity,
    policy_identity: ACTIVE_GROUNDING_POLICY.identity,
    fixture_sha256: control.fixture_sha256,
    gold_sha256: control.gold_sha256,
    schema_hashes: schemaHashes,
    prompt_contract_hashes: { v4: sha256(DECISION_EXTRACTION_INSTRUCTIONS), v5: sha256(POLICY_DECISION_EXTRACTION_INSTRUCTIONS) },
    provider_calls: records.length,
    admission_writes: 0,
    records,
    scores,
    summary: summary(scores),
  };
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

module.exports = { buildPrompt, collect, conditions, loadControl, scoreCase, summary, verifyReport };
if (require.main === module) (async () => {
  const args = parseArgs(process.argv.slice(2));
  if (!args.allowLiveProvider) return process.stdout.write(`${JSON.stringify({ status: "offline-no-default-provider", provider_calls: 0, admission_writes: 0 })}\n`);
  if (!args.fixture || !args.gold || !args.model || !args.output_root) throw new Error("live gates are incomplete");
  const report = await collect({ fixtureFile: path.resolve(args.fixture), goldFile: path.resolve(args.gold), model: args.model, outputRoot: path.resolve(args.output_root), resume: args.resumeAfterUserInterrupt });
  process.stdout.write(`${JSON.stringify({ status: report.status, summary: report.summary })}\n`);
})().catch(error => { console.error(error.message); process.exitCode = 1; });
