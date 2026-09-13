"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { EvidenceExtraction, ADMISSION_EXTRACTION_INSTRUCTIONS, createMemoryExtractionJsonSchema } = require("./llm-schema");
const { ACTIVE_ONTOLOGY, canonicalJson } = require("./ontology-registry");
const { inspectExtractionCandidate } = require("./extraction-admission");
const { validateDataset, DATASET_SHA256 } = require("./cdr-annotation-harness");

const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const readJsonl = file => fs.readFileSync(file, "utf8").trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
const safeId = value => {
  if (typeof value !== "string" || !/^[a-z0-9-]+$/.test(value)) throw new Error("unsafe case id");
  return value;
};
const buildPrompt = sourceText => `${ADMISSION_EXTRACTION_INSTRUCTIONS}\n\nUSER MESSAGE:\n${sourceText}\n\nReturn only the schema-conforming result. Do not use tools.`;

function loadFixture(file) {
  const text = fs.readFileSync(file, "utf8");
  const rows = text.trim().split(/\r?\n/).filter(Boolean).map((line, index) => {
    const row = JSON.parse(line);
    if (!row || canonicalJson(Object.keys(row).sort()) !== canonicalJson(["case_id", "source_text"]) || typeof row.source_text !== "string" || !row.source_text)
      throw new Error(`invalid fixture row ${index + 1}`);
    safeId(row.case_id);
    return row;
  });
  if (rows.length !== 9 || new Set(rows.map(row => row.case_id)).size !== rows.length) throw new Error("fixture must contain nine unique cases");
  return { rows, sha256: sha256(text) };
}

function dateValue(value) {
  return Number(value.replaceAll("-", ""));
}

function goldAssertion(assertion) {
  let validFrom = null;
  let validTo = null;
  if (assertion.time.kind === "interval") {
    validFrom = dateValue(assertion.time.from);
    validTo = dateValue(assertion.time.to);
  } else if (assertion.time.kind === "point") {
    validFrom = dateValue(assertion.time.value);
    validTo = validFrom;
  } else if (assertion.time.kind === "ongoing") {
    validFrom = dateValue(assertion.time.since);
  }
  return {
    polarity: assertion.polarity,
    relation: assertion.predicate,
    arguments: assertion.arguments,
    valid_from: validFrom,
    valid_to: validTo,
    source_span: assertion.source_span,
  };
}

const semanticProjection = assertion => ({
  polarity: assertion.polarity,
  relation: assertion.relation,
  arguments: assertion.arguments,
  valid_from: assertion.valid_from,
  valid_to: assertion.valid_to,
});
const semanticKey = assertion => canonicalJson(semanticProjection(assertion));

function scoreCase(fixture, gold, candidate) {
  const diagnostics = inspectExtractionCandidate(candidate, fixture.source_text);
  const expected = gold.assertions.map(goldAssertion);
  const actual = candidate.assertions;
  const expectedKeys = expected.map(item => canonicalJson({
    polarity: item.polarity,
    relation: item.relation,
    arguments: item.arguments,
    valid_from: item.valid_from,
    valid_to: item.valid_to,
  })).sort();
  const actualKeys = actual.map(semanticKey).sort();
  const remaining = [...actual];
  let matched = 0;
  let strictEvidence = 0;
  let relaxedEvidence = 0;
  for (const wanted of expected) {
    const index = remaining.findIndex(item => semanticKey(item) === canonicalJson({
      polarity: wanted.polarity,
      relation: wanted.relation,
      arguments: wanted.arguments,
      valid_from: wanted.valid_from,
      valid_to: wanted.valid_to,
    }));
    if (index < 0) continue;
    const got = remaining.splice(index, 1)[0];
    matched += 1;
    if (got.evidence_span === wanted.source_span) strictEvidence += 1;
    if (got.evidence_span.includes(wanted.source_span) || wanted.source_span.includes(got.evidence_span)) relaxedEvidence += 1;
  }
  const semanticExact = canonicalJson(actualKeys) === canonicalJson(expectedKeys) && candidate.ontology_candidates.length === 0;
  return {
    case_id: fixture.case_id,
    gold_decision: gold.decision,
    write_boundary_expected: gold.decision === "write",
    write_boundary_actual: actual.length > 0,
    write_boundary_correct: (gold.decision === "write") === (actual.length > 0),
    semantic_exact: semanticExact,
    admission_eligible: diagnostics.length === 0,
    validator_diagnostics: diagnostics,
    expected_assertions: expected.length,
    predicted_assertions: actual.length,
    matched_assertions: matched,
    strict_evidence_matches: strictEvidence,
    relaxed_evidence_matches: relaxedEvidence,
    ontology_candidates: candidate.ontology_candidates.length,
  };
}

function aggregate(scores) {
  const sum = key => scores.reduce((total, score) => total + score[key], 0);
  const ratio = (numerator, denominator) => ({ numerator, denominator, rate: denominator ? numerator / denominator : null });
  const goldAssertions = sum("expected_assertions");
  const predictedAssertions = sum("predicted_assertions");
  const matchedAssertions = sum("matched_assertions");
  return {
    cases: scores.length,
    write_boundary_accuracy: ratio(scores.filter(item => item.write_boundary_correct).length, scores.length),
    semantic_case_exact: ratio(scores.filter(item => item.semantic_exact).length, scores.length),
    admission_eligible: ratio(scores.filter(item => item.admission_eligible).length, scores.length),
    assertion_precision: ratio(matchedAssertions, predictedAssertions),
    assertion_recall: ratio(matchedAssertions, goldAssertions),
    strict_evidence_exact: ratio(sum("strict_evidence_matches"), matchedAssertions),
    relaxed_evidence_overlap: ratio(sum("relaxed_evidence_matches"), matchedAssertions),
    ontology_candidates: sum("ontology_candidates"),
  };
}

function artifact(root, file) {
  return { path: path.relative(root, file), sha256: sha256(fs.readFileSync(file)), bytes: fs.statSync(file).size };
}

function verifyReport(report, fixtureRows, goldRows) {
  if (!report || report.schema_version !== "product-extraction-v3-eval-report-v1") throw new Error("report schema mismatch");
  if (report.status !== "complete-unadmitted-v1" || report.provider !== "codex" || typeof report.model !== "string" || !report.model) throw new Error("report run identity mismatch");
  if (report.records.length !== fixtureRows.length || report.provider_calls !== fixtureRows.length || report.admission_writes !== 0) throw new Error("run cardinality mismatch");
  const gold = new Map(goldRows.map(row => [row.case_id, row]));
  const replayed = report.records.map((record, index) => {
    const fixture = fixtureRows[index];
    if (record.case_id !== fixture.case_id || record.source_sha256 !== sha256(fixture.source_text)) throw new Error("record fixture binding mismatch");
    if (record.prompt_sha256 !== sha256(buildPrompt(fixture.source_text))) throw new Error("record prompt hash mismatch");
    if (!record.usage || !["input_tokens", "cached_input_tokens", "output_tokens"].every(key => Number.isInteger(record.usage[key]) && record.usage[key] >= 0)) throw new Error("record usage mismatch");
    const candidate = EvidenceExtraction.parse(record.candidate);
    if (record.candidate_sha256 !== sha256(canonicalJson(candidate))) throw new Error("candidate hash mismatch");
    return scoreCase(fixture, gold.get(fixture.case_id), candidate);
  });
  if (canonicalJson(replayed) !== canonicalJson(report.scores) || canonicalJson(aggregate(replayed)) !== canonicalJson(report.summary)) throw new Error("score replay mismatch");
  return { status: "verified-product-extraction-v3-eval-v1", records: replayed.length, summary: report.summary };
}

async function collect({ fixtureFile, goldFile, model, outputRoot, invoke }) {
  if (!model || process.env.CODEX_MODEL !== model) throw new Error("model must equal explicit CODEX_MODEL");
  if (fs.existsSync(outputRoot)) throw new Error("output root already exists");
  const fixture = loadFixture(fixtureFile);
  validateDataset(goldFile, DATASET_SHA256);
  const goldRows = readJsonl(goldFile);
  const goldById = new Map(goldRows.map(row => [row.case_id, row]));
  if (fixture.rows.some(row => !goldById.has(row.case_id))) throw new Error("fixture case missing from gold");
  fs.mkdirSync(outputRoot, { recursive: true, mode: 0o700 });
  const schemaFile = path.resolve("schemas/memory-extraction-v3.schema.json");
  const schema = createMemoryExtractionJsonSchema(ACTIVE_ONTOLOGY, { schemaVersion: "memory-extraction-v3", assertionEvidence: true });
  const provider = invoke || require("./providers/codex").runCodexEvidence;
  const records = [];
  for (const [index, row] of fixture.rows.entries()) {
    const prompt = buildPrompt(row.source_text);
    const rawDirectory = path.join(outputRoot, "raw", safeId(row.case_id));
    fs.mkdirSync(rawDirectory, { recursive: true, mode: 0o700 });
    fs.writeFileSync(path.join(rawDirectory, "prompt.txt"), prompt, { flag: "wx", mode: 0o600 });
    let response;
    try {
      response = await provider(prompt, { schema: schemaFile, model });
    } catch (error) {
      if (error.stdout) fs.writeFileSync(path.join(rawDirectory, "stdout.jsonl"), error.stdout, { flag: "wx", mode: 0o600 });
      if (error.stderr) fs.writeFileSync(path.join(rawDirectory, "stderr.txt"), error.stderr, { flag: "wx", mode: 0o600 });
      fs.writeFileSync(path.join(outputRoot, "failure.json"), `${JSON.stringify({ status: "terminal-partial-run", failed_index: index, case_id: row.case_id, completed_calls: records.length, error: error.message }, null, 2)}\n`, { flag: "wx", mode: 0o600 });
      throw error;
    }
    const stdoutFile = path.join(rawDirectory, "stdout.jsonl");
    const stderrFile = path.join(rawDirectory, "stderr.txt");
    fs.writeFileSync(stdoutFile, response.stdout, { flag: "wx", mode: 0o600 });
    fs.writeFileSync(stderrFile, response.stderr, { flag: "wx", mode: 0o600 });
    const candidate = EvidenceExtraction.parse(JSON.parse(response.output_text));
    records.push({
      case_id: row.case_id,
      source_sha256: sha256(row.source_text),
      prompt_sha256: sha256(prompt),
      candidate,
      candidate_sha256: sha256(canonicalJson(candidate)),
      usage: response.usage,
      raw: { stdout: artifact(outputRoot, stdoutFile), stderr: artifact(outputRoot, stderrFile) },
    });
  }
  const scores = records.map((record, index) => scoreCase(fixture.rows[index], goldById.get(record.case_id), record.candidate));
  const report = {
    schema_version: "product-extraction-v3-eval-report-v1",
    status: "complete-unadmitted-v1",
    provider: "codex",
    model,
    fixture_sha256: fixture.sha256,
    gold_sha256: DATASET_SHA256,
    schema_sha256: sha256(canonicalJson(schema)),
    prompt_contract_sha256: sha256(ADMISSION_EXTRACTION_INSTRUCTIONS),
    provider_calls: records.length,
    admission_writes: 0,
    records,
    scores,
    summary: aggregate(scores),
  };
  verifyReport(report, fixture.rows, goldRows);
  fs.writeFileSync(path.join(outputRoot, "report.json"), `${JSON.stringify(report, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  return report;
}

function parseArgs(argv) {
  const args = { allowLiveProvider: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--allow-live-provider") args.allowLiveProvider = true;
    else if (["--fixture", "--gold", "--model", "--output-root"].includes(token)) args[token.slice(2).replaceAll("-", "_")] = argv[++index];
    else throw new Error(`unknown argument: ${token}`);
  }
  return args;
}

module.exports = { aggregate, buildPrompt, collect, goldAssertion, loadFixture, parseArgs, scoreCase, verifyReport };

if (require.main === module) (async () => {
  const args = parseArgs(process.argv.slice(2));
  if (!args.allowLiveProvider) {
    process.stdout.write(`${JSON.stringify({ status: "offline-no-default-provider", provider_calls: 0, admission_writes: 0 })}\n`);
    return;
  }
  if (!args.fixture || !args.gold || !args.model || !args.output_root) throw new Error("live gates are incomplete");
  const report = await collect({ fixtureFile: path.resolve(args.fixture), goldFile: path.resolve(args.gold), model: args.model, outputRoot: path.resolve(args.output_root) });
  process.stdout.write(`${JSON.stringify({ status: report.status, provider_calls: report.provider_calls, summary: report.summary })}\n`);
})().catch(error => { console.error(error.message); process.exitCode = 1; });
