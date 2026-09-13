"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { canonicalJson } = require("./ontology-registry");
const { ACTIVE_GROUNDING_POLICY } = require("./predicate-grounding-policy");
const {
  GroundingReviewV2,
  GROUNDING_REVIEW_V2_INSTRUCTIONS,
  buildGroundingReviewV2Prompt,
  createGroundingReviewV2JsonSchema,
  inspectGroundingReviewV2,
} = require("./grounding-review");

const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const readJsonl = file => fs.readFileSync(file, "utf8").trim().split(/\r?\n/).map(JSON.parse);
const artifact = (root, file) => ({ path: path.relative(root, file), sha256: sha256(fs.readFileSync(file)), bytes: fs.statSync(file).size });

function loadControl(fixtureFile, goldFile) {
  const fixtureBytes = fs.readFileSync(fixtureFile);
  const goldBytes = fs.readFileSync(goldFile);
  const fixture = readJsonl(fixtureFile);
  const gold = readJsonl(goldFile);
  if (fixture.length !== 24 || gold.length !== 24) throw new Error("grounding review control requires 24 cases");
  fixture.forEach((row, index) => {
    if (row.case_id !== `pgr-${String(index + 1).padStart(2, "0")}` || !row.source_text || !row.candidate || row.candidate.assertions.length < 1) throw new Error("invalid grounding fixture row");
    if (canonicalJson(row.policy_identity) !== canonicalJson(ACTIVE_GROUNDING_POLICY.identity)) throw new Error("fixture grounding policy identity mismatch");
    if (sha256(canonicalJson(row.candidate)) !== row.candidate_sha256) throw new Error("fixture candidate hash mismatch");
    if (!gold[index] || gold[index].case_id !== row.case_id || gold[index].reviews.length !== row.candidate.assertions.length) throw new Error("grounding gold binding mismatch");
    gold[index].reviews.forEach((review, assertionIndex) => {
      if (review.assertion_index !== assertionIndex || !["entailed", "not_entailed", "uncertain"].includes(review.verdict)) throw new Error("invalid grounding gold verdict");
    });
  });
  const verdictCounts = gold.flatMap(row => row.reviews).reduce((counts, review) => ({ ...counts, [review.verdict]: (counts[review.verdict] || 0) + 1 }), {});
  if (verdictCounts.entailed !== 10 || verdictCounts.not_entailed !== 13 || verdictCounts.uncertain !== 1) throw new Error("grounding gold balance mismatch");
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
  if (!report || report.schema_version !== "memory-grounding-review-v2-policy-eval-report-v1" || report.status !== "complete-unadmitted-v2") throw new Error("grounding report identity mismatch");
  if (report.fixture_sha256 !== control.fixture_sha256 || report.gold_sha256 !== control.gold_sha256 || canonicalJson(report.policy_identity) !== canonicalJson(ACTIVE_GROUNDING_POLICY.identity) || report.records.length !== 24 || report.provider_calls !== 24 || report.admission_writes !== 0) throw new Error("grounding report binding mismatch");
  const scores = report.records.map((record, index) => {
    const fixture = control.fixture[index];
    if (record.case_id !== fixture.case_id || record.prompt_sha256 !== sha256(buildGroundingReviewV2Prompt(fixture.source_text, fixture.candidate))) throw new Error("grounding record binding mismatch");
    const review = GroundingReviewV2.parse(record.review);
    if (record.review_sha256 !== sha256(canonicalJson(review))) throw new Error("grounding review hash mismatch");
    if (!record.usage || !["input_tokens", "cached_input_tokens", "output_tokens"].every(key => Number.isInteger(record.usage[key]) && record.usage[key] >= 0)) throw new Error("grounding usage mismatch");
    const diagnostics = inspectGroundingReviewV2(review, fixture.source_text, fixture.candidate);
    return scoreCase(control.gold[index], review, diagnostics);
  });
  if (canonicalJson(scores) !== canonicalJson(report.scores) || canonicalJson(summary(scores)) !== canonicalJson(report.summary)) throw new Error("grounding score replay mismatch");
  return { status: "verified-memory-grounding-review-v2-policy-eval-v1", summary: report.summary };
}

async function collect({ fixtureFile, goldFile, model, outputRoot, invoke, resume = false }) {
  if (!model || process.env.CODEX_MODEL !== model) throw new Error("model must equal explicit CODEX_MODEL");
  if (fs.existsSync(outputRoot) && !resume) throw new Error("output root already exists");
  const control = loadControl(fixtureFile, goldFile);
  const schema = createGroundingReviewV2JsonSchema();
  const schemaFile = path.resolve("schemas/memory-grounding-review-v2.schema.json");
  const provider = invoke || require("./providers/codex").runCodexEvidence;
  fs.mkdirSync(outputRoot, { recursive: true, mode: 0o700 });
  const recordsFile = path.join(outputRoot, "records.jsonl");
  const records = resume && fs.existsSync(recordsFile) ? readJsonl(recordsFile) : [];
  records.forEach((record, index) => {
    const fixture = control.fixture[index];
    if (!fixture || record.case_id !== fixture.case_id || record.prompt_sha256 !== sha256(buildGroundingReviewV2Prompt(fixture.source_text, fixture.candidate))) throw new Error("resume record binding mismatch");
    GroundingReviewV2.parse(record.review);
  });
  if (records.length > control.fixture.length) throw new Error("resume record count mismatch");
  for (let index = records.length; index < control.fixture.length; index += 1) {
    const fixture = control.fixture[index];
    const prompt = buildGroundingReviewV2Prompt(fixture.source_text, fixture.candidate);
    const rawRoot = path.join(outputRoot, "raw", fixture.case_id);
    const inflightRoot = path.join(outputRoot, "raw", `.inflight-${fixture.case_id}`);
    if (fs.existsSync(inflightRoot)) fs.renameSync(inflightRoot, path.join(outputRoot, "raw", `.failed-${fixture.case_id}-${Date.now()}`));
    fs.mkdirSync(inflightRoot, { recursive: true, mode: 0o700 });
    const promptFile = path.join(inflightRoot, "prompt.txt");
    fs.writeFileSync(promptFile, prompt, { flag: "wx", mode: 0o600 });
    let response;
    try { response = await provider(prompt, { schema: schemaFile, model }); }
    catch (error) {
      if (error.stdout) fs.writeFileSync(path.join(inflightRoot, "stdout.jsonl"), error.stdout, { flag: "wx", mode: 0o600 });
      if (error.stderr) fs.writeFileSync(path.join(inflightRoot, "stderr.txt"), error.stderr, { flag: "wx", mode: 0o600 });
      fs.writeFileSync(path.join(outputRoot, "failure.json"), `${JSON.stringify({ status: "terminal-partial-run", failed_index: index, case_id: fixture.case_id, completed_calls: records.length, error: error.message }, null, 2)}\n`, { mode: 0o600 });
      throw error;
    }
    const stdoutFile = path.join(inflightRoot, "stdout.jsonl");
    const stderrFile = path.join(inflightRoot, "stderr.txt");
    fs.writeFileSync(stdoutFile, response.stdout, { flag: "wx", mode: 0o600 });
    fs.writeFileSync(stderrFile, response.stderr, { flag: "wx", mode: 0o600 });
    const review = GroundingReviewV2.parse(JSON.parse(response.output_text));
    fs.renameSync(inflightRoot, rawRoot);
    const record = { case_id: fixture.case_id, prompt_sha256: sha256(prompt), review, review_sha256: sha256(canonicalJson(review)), usage: response.usage, raw: { prompt: artifact(outputRoot, path.join(rawRoot, "prompt.txt")), stdout: artifact(outputRoot, path.join(rawRoot, "stdout.jsonl")), stderr: artifact(outputRoot, path.join(rawRoot, "stderr.txt")) } };
    records.push(record);
    fs.appendFileSync(recordsFile, `${JSON.stringify(record)}\n`, { mode: 0o600 });
  }
  const scores = records.map((record, index) => scoreCase(control.gold[index], record.review, inspectGroundingReviewV2(record.review, control.fixture[index].source_text, control.fixture[index].candidate)));
  const report = { schema_version: "memory-grounding-review-v2-policy-eval-report-v1", status: "complete-unadmitted-v2", provider: "codex", model, policy_identity: ACTIVE_GROUNDING_POLICY.identity, fixture_sha256: control.fixture_sha256, gold_sha256: control.gold_sha256, schema_sha256: sha256(canonicalJson(schema)), prompt_contract_sha256: sha256(GROUNDING_REVIEW_V2_INSTRUCTIONS), provider_calls: records.length, admission_writes: 0, records, scores, summary: summary(scores) };
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

module.exports = { collect, loadControl, scoreCase, summary, verifyReport };
if (require.main === module) (async () => {
  const args = parseArgs(process.argv.slice(2));
  if (!args.allowLiveProvider) return process.stdout.write(`${JSON.stringify({ status: "offline-no-default-provider", provider_calls: 0, admission_writes: 0 })}\n`);
  if (!args.fixture || !args.gold || !args.model || !args.output_root) throw new Error("live gates are incomplete");
  const report = await collect({ fixtureFile: path.resolve(args.fixture), goldFile: path.resolve(args.gold), model: args.model, outputRoot: path.resolve(args.output_root), resume: args.resumeAfterUserInterrupt });
  process.stdout.write(`${JSON.stringify({ status: report.status, summary: report.summary })}\n`);
})().catch(error => { console.error(error.message); process.exitCode = 1; });
