"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { canonicalJson } = require("./ontology-registry");
const {
  GroundingReview,
  GROUNDING_REVIEW_INSTRUCTIONS,
  buildGroundingReviewPrompt,
  createGroundingReviewJsonSchema,
  inspectGroundingReview,
} = require("./grounding-review");

const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const readJsonl = file => fs.readFileSync(file, "utf8").trim().split(/\r?\n/).map(JSON.parse);
const artifact = (root, file) => ({ path: path.relative(root, file), sha256: sha256(fs.readFileSync(file)), bytes: fs.statSync(file).size });

function loadControl(fixtureFile, goldFile) {
  const fixtureBytes = fs.readFileSync(fixtureFile);
  const goldBytes = fs.readFileSync(goldFile);
  const fixture = readJsonl(fixtureFile);
  const gold = readJsonl(goldFile);
  if (fixture.length !== 13 || gold.length !== 13) throw new Error("grounding review control requires 13 cases");
  fixture.forEach((row, index) => {
    if (row.case_id !== `gr-${String(index + 1).padStart(2, "0")}` || !row.source_text || !row.candidate || row.candidate.assertions.length < 1) throw new Error("invalid grounding fixture row");
    if (sha256(canonicalJson(row.candidate)) !== row.candidate_sha256) throw new Error("fixture candidate hash mismatch");
    const sourceReport = path.resolve(row.source_report);
    if (sha256(fs.readFileSync(sourceReport)) !== row.source_report_sha256) throw new Error("fixture source report hash mismatch");
    if (!gold[index] || gold[index].case_id !== row.case_id || gold[index].reviews.length !== row.candidate.assertions.length) throw new Error("grounding gold binding mismatch");
    gold[index].reviews.forEach((review, assertionIndex) => {
      if (review.assertion_index !== assertionIndex || !["entailed", "not_entailed", "uncertain"].includes(review.verdict)) throw new Error("invalid grounding gold verdict");
    });
  });
  return { fixture, gold, fixture_sha256: sha256(fixtureBytes), gold_sha256: sha256(goldBytes) };
}

function scoreCase(expected, review, diagnostics) {
  const predicted = new Map(review.reviews.map(item => [item.assertion_index, item.verdict]));
  const assertions = expected.reviews.map(item => ({ assertion_index: item.assertion_index, expected: item.verdict, actual: predicted.get(item.assertion_index), exact: predicted.get(item.assertion_index) === item.verdict }));
  const expectedGate = expected.reviews.every(item => item.verdict === "entailed");
  const actualGate = diagnostics.length === 0 && review.reviews.every(item => item.verdict === "entailed");
  return {
    case_id: expected.case_id,
    assertions,
    exact: assertions.every(item => item.exact),
    expected_gate_eligible: expectedGate,
    actual_gate_eligible: actualGate,
    gate_correct: expectedGate === actualGate,
    harmful_assertions_passed: assertions.filter(item => item.expected !== "entailed" && item.actual === "entailed").length,
    entailed_assertions_blocked: assertions.filter(item => item.expected === "entailed" && item.actual !== "entailed").length,
    diagnostics,
  };
}

function summary(scores) {
  const assertionRows = scores.flatMap(score => score.assertions);
  const ratio = (rows, predicate) => ({ numerator: rows.filter(predicate).length, denominator: rows.length, rate: rows.length ? rows.filter(predicate).length / rows.length : null });
  return {
    cases: scores.length,
    assertions: assertionRows.length,
    verdict_accuracy: ratio(assertionRows, row => row.exact),
    exact_cases: ratio(scores, row => row.exact),
    gate_accuracy: ratio(scores, row => row.gate_correct),
    harmful_assertions_passed: scores.reduce((sum, row) => sum + row.harmful_assertions_passed, 0),
    entailed_assertions_blocked: scores.reduce((sum, row) => sum + row.entailed_assertions_blocked, 0),
    review_diagnostics: scores.reduce((sum, row) => sum + row.diagnostics.length, 0),
  };
}

function verifyReport(report, control) {
  if (!report || report.schema_version !== "memory-grounding-review-eval-report-v1" || report.status !== "complete-unadmitted-v1") throw new Error("grounding report identity mismatch");
  if (report.fixture_sha256 !== control.fixture_sha256 || report.gold_sha256 !== control.gold_sha256 || report.records.length !== 13 || report.provider_calls !== 13 || report.admission_writes !== 0) throw new Error("grounding report binding mismatch");
  const scores = report.records.map((record, index) => {
    const fixture = control.fixture[index];
    if (record.case_id !== fixture.case_id || record.prompt_sha256 !== sha256(buildGroundingReviewPrompt(fixture.source_text, fixture.candidate))) throw new Error("grounding record binding mismatch");
    const review = GroundingReview.parse(record.review);
    if (record.review_sha256 !== sha256(canonicalJson(review))) throw new Error("grounding review hash mismatch");
    if (!record.usage || !["input_tokens", "cached_input_tokens", "output_tokens"].every(key => Number.isInteger(record.usage[key]) && record.usage[key] >= 0)) throw new Error("grounding usage mismatch");
    const diagnostics = inspectGroundingReview(review, fixture.source_text, fixture.candidate);
    return scoreCase(control.gold[index], review, diagnostics);
  });
  if (canonicalJson(scores) !== canonicalJson(report.scores) || canonicalJson(summary(scores)) !== canonicalJson(report.summary)) throw new Error("grounding score replay mismatch");
  return { status: "verified-memory-grounding-review-eval-v1", summary: report.summary };
}

async function collect({ fixtureFile, goldFile, model, outputRoot, invoke }) {
  if (!model || process.env.CODEX_MODEL !== model) throw new Error("model must equal explicit CODEX_MODEL");
  if (fs.existsSync(outputRoot)) throw new Error("output root already exists");
  const control = loadControl(fixtureFile, goldFile);
  const schema = createGroundingReviewJsonSchema();
  const schemaFile = path.resolve("schemas/memory-grounding-review-v1.schema.json");
  const provider = invoke || require("./providers/codex").runCodexEvidence;
  fs.mkdirSync(outputRoot, { recursive: true, mode: 0o700 });
  const records = [];
  for (const [index, fixture] of control.fixture.entries()) {
    const prompt = buildGroundingReviewPrompt(fixture.source_text, fixture.candidate);
    const rawRoot = path.join(outputRoot, "raw", fixture.case_id);
    fs.mkdirSync(rawRoot, { recursive: true, mode: 0o700 });
    const promptFile = path.join(rawRoot, "prompt.txt");
    fs.writeFileSync(promptFile, prompt, { flag: "wx", mode: 0o600 });
    let response;
    try { response = await provider(prompt, { schema: schemaFile, model }); }
    catch (error) {
      if (error.stdout) fs.writeFileSync(path.join(rawRoot, "stdout.jsonl"), error.stdout, { flag: "wx", mode: 0o600 });
      if (error.stderr) fs.writeFileSync(path.join(rawRoot, "stderr.txt"), error.stderr, { flag: "wx", mode: 0o600 });
      fs.writeFileSync(path.join(outputRoot, "failure.json"), `${JSON.stringify({ status: "terminal-partial-run", failed_index: index, case_id: fixture.case_id, completed_calls: records.length, error: error.message }, null, 2)}\n`, { flag: "wx", mode: 0o600 });
      throw error;
    }
    const stdoutFile = path.join(rawRoot, "stdout.jsonl");
    const stderrFile = path.join(rawRoot, "stderr.txt");
    fs.writeFileSync(stdoutFile, response.stdout, { flag: "wx", mode: 0o600 });
    fs.writeFileSync(stderrFile, response.stderr, { flag: "wx", mode: 0o600 });
    const review = GroundingReview.parse(JSON.parse(response.output_text));
    records.push({ case_id: fixture.case_id, prompt_sha256: sha256(prompt), review, review_sha256: sha256(canonicalJson(review)), usage: response.usage, raw: { prompt: artifact(outputRoot, promptFile), stdout: artifact(outputRoot, stdoutFile), stderr: artifact(outputRoot, stderrFile) } });
  }
  const scores = records.map((record, index) => scoreCase(control.gold[index], record.review, inspectGroundingReview(record.review, control.fixture[index].source_text, control.fixture[index].candidate)));
  const report = { schema_version: "memory-grounding-review-eval-report-v1", status: "complete-unadmitted-v1", provider: "codex", model, fixture_sha256: control.fixture_sha256, gold_sha256: control.gold_sha256, schema_sha256: sha256(canonicalJson(schema)), prompt_contract_sha256: sha256(GROUNDING_REVIEW_INSTRUCTIONS), provider_calls: records.length, admission_writes: 0, records, scores, summary: summary(scores) };
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

module.exports = { collect, loadControl, scoreCase, summary, verifyReport };
if (require.main === module) (async () => {
  const args = parseArgs(process.argv.slice(2));
  if (!args.allowLiveProvider) return process.stdout.write(`${JSON.stringify({ status: "offline-no-default-provider", provider_calls: 0, admission_writes: 0 })}\n`);
  if (!args.fixture || !args.gold || !args.model || !args.output_root) throw new Error("live gates are incomplete");
  const report = await collect({ fixtureFile: path.resolve(args.fixture), goldFile: path.resolve(args.gold), model: args.model, outputRoot: path.resolve(args.output_root) });
  process.stdout.write(`${JSON.stringify({ status: report.status, summary: report.summary })}\n`);
})().catch(error => { console.error(error.message); process.exitCode = 1; });
