"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { DecisionExtraction, DECISION_EXTRACTION_INSTRUCTIONS, createMemoryExtractionJsonSchema } = require("./llm-schema");
const { ACTIVE_ONTOLOGY, canonicalJson } = require("./ontology-registry");
const { inspectExtractionCandidateV2 } = require("./extraction-admission");
const {
  GroundingReview,
  GROUNDING_REVIEW_INSTRUCTIONS,
  buildGroundingReviewPrompt,
  createGroundingReviewJsonSchema,
  inspectGroundingReview,
} = require("./grounding-review");

const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const readJsonl = file => fs.readFileSync(file, "utf8").trim().split(/\r?\n/).map(JSON.parse);
const extractionPrompt = sourceText => `${DECISION_EXTRACTION_INSTRUCTIONS}\n\nUSER MESSAGE:\n${sourceText}\n\nReturn only the schema-conforming result. Do not use tools.`;
const projection = assertion => ({ polarity: assertion.polarity, relation: assertion.relation, arguments: assertion.arguments, valid_from: assertion.valid_from, valid_to: assertion.valid_to });
const assertionKeys = assertions => assertions.map(assertion => canonicalJson(projection(assertion))).sort();
const artifact = (root, file) => ({ path: path.relative(root, file), sha256: sha256(fs.readFileSync(file)), bytes: fs.statSync(file).size });

function loadControl(fixtureFile, goldFile) {
  const fixtureBytes = fs.readFileSync(fixtureFile);
  const goldBytes = fs.readFileSync(goldFile);
  const fixture = readJsonl(fixtureFile);
  const gold = readJsonl(goldFile);
  if (fixture.length !== 12 || gold.length !== 12) throw new Error("e2e control requires 12 cases");
  fixture.forEach((row, index) => {
    if (row.case_id !== `eg-${String(index + 1).padStart(2, "0")}` || typeof row.source_text !== "string" || !row.source_text) throw new Error("invalid e2e fixture row");
    const expected = gold[index];
    if (!expected || expected.case_id !== row.case_id || !["write", "clarify", "ontology_candidate"].includes(expected.expected_decision) || !Array.isArray(expected.assertions)) throw new Error("e2e gold binding mismatch");
    if ((expected.expected_decision === "write") !== (expected.assertions.length > 0)) throw new Error("e2e gold assertion mismatch");
    expected.assertions.forEach(assertion => {
      if (!ACTIVE_ONTOLOGY.predicates[assertion.relation] || assertion.arguments.length !== ACTIVE_ONTOLOGY.predicates[assertion.relation].arity) throw new Error("e2e gold predicate mismatch");
    });
  });
  return { fixture, gold, fixture_sha256: sha256(fixtureBytes), gold_sha256: sha256(goldBytes) };
}

function expectedReviewVerdict(assertion, expected) {
  const expectedKeys = new Set(assertionKeys(expected.assertions));
  if (expectedKeys.has(canonicalJson(projection(assertion)))) return "entailed";
  return expected.expected_decision === "clarify" ? "uncertain" : "not_entailed";
}

function scoreCase(expected, candidate, extractionDiagnostics, review, reviewDiagnostics) {
  const expectedKeys = assertionKeys(expected.assertions);
  const predictedKeys = assertionKeys(candidate.assertions);
  const assertionExact = canonicalJson(expectedKeys) === canonicalJson(predictedKeys);
  const decisionExact = candidate.decision === expected.expected_decision;
  const payloadExact = expected.expected_decision === "ontology_candidate" ? candidate.ontology_candidates.length > 0 : candidate.ontology_candidates.length === 0;
  const semanticExact = decisionExact && assertionExact && payloadExact;
  const actualWrite = candidate.decision === "write";
  const candidateSafe = actualWrite && expected.expected_decision === "write" && assertionExact && candidate.ontology_candidates.length === 0;
  const v2Eligible = actualWrite && extractionDiagnostics.length === 0;
  const reviewEligible = actualWrite && review !== null && reviewDiagnostics.length === 0 && review.reviews.every(item => item.verdict === "entailed");
  const hybridEligible = v2Eligible && reviewEligible;
  const reviewAssertions = review ? review.reviews.map(item => ({
    assertion_index: item.assertion_index,
    expected: expectedReviewVerdict(candidate.assertions[item.assertion_index], expected),
    actual: item.verdict,
    exact: item.verdict === expectedReviewVerdict(candidate.assertions[item.assertion_index], expected),
  })) : [];
  return {
    case_id: expected.case_id,
    expected_decision: expected.expected_decision,
    actual_decision: candidate.decision,
    decision_exact: decisionExact,
    assertion_exact: assertionExact,
    semantic_exact: semanticExact,
    actual_write: actualWrite,
    candidate_safe: candidateSafe,
    validator_v2_eligible: v2Eligible,
    semantic_review_eligible: reviewEligible,
    hybrid_eligible: hybridEligible,
    harmful_v2_write: actualWrite && !candidateSafe && v2Eligible,
    harmful_review_write: actualWrite && !candidateSafe && reviewEligible,
    harmful_hybrid_write: actualWrite && !candidateSafe && hybridEligible,
    correct_v2_write_blocked: candidateSafe && !v2Eligible,
    correct_review_write_blocked: candidateSafe && !reviewEligible,
    correct_hybrid_write_blocked: candidateSafe && !hybridEligible,
    expected_write_missed_by_extractor: expected.expected_decision === "write" && !actualWrite,
    final_hybrid_correct: expected.expected_decision === "write" ? candidateSafe && hybridEligible : !hybridEligible,
    review_assertions: reviewAssertions,
    extraction_diagnostics: extractionDiagnostics,
    review_diagnostics: reviewDiagnostics,
  };
}

function summary(scores) {
  const ratio = predicate => ({ numerator: scores.filter(predicate).length, denominator: scores.length, rate: scores.filter(predicate).length / scores.length });
  const reviewAssertions = scores.flatMap(score => score.review_assertions);
  return {
    cases: scores.length,
    extraction_decision_accuracy: ratio(row => row.decision_exact),
    extraction_semantic_exact: ratio(row => row.semantic_exact),
    review_calls: scores.filter(row => row.actual_write).length,
    review_verdict_accuracy: { numerator: reviewAssertions.filter(row => row.exact).length, denominator: reviewAssertions.length, rate: reviewAssertions.length ? reviewAssertions.filter(row => row.exact).length / reviewAssertions.length : null },
    final_hybrid_accuracy: ratio(row => row.final_hybrid_correct),
    harmful_writes: {
      validator_v2: scores.filter(row => row.harmful_v2_write).length,
      semantic_review: scores.filter(row => row.harmful_review_write).length,
      hybrid: scores.filter(row => row.harmful_hybrid_write).length,
    },
    correct_writes_blocked: {
      validator_v2: scores.filter(row => row.correct_v2_write_blocked).length,
      semantic_review: scores.filter(row => row.correct_review_write_blocked).length,
      hybrid: scores.filter(row => row.correct_hybrid_write_blocked).length,
    },
    expected_writes_missed_by_extractor: scores.filter(row => row.expected_write_missed_by_extractor).length,
  };
}

function verifyReport(report, control) {
  if (!report || report.schema_version !== "extraction-grounding-e2e-report-v1" || report.status !== "complete-unadmitted-v1") throw new Error("e2e report identity mismatch");
  const reviewCalls = report.records.filter(record => record.review !== null).length;
  if (report.fixture_sha256 !== control.fixture_sha256 || report.gold_sha256 !== control.gold_sha256 || report.records.length !== 12 || report.extraction_calls !== 12 || report.review_calls !== reviewCalls || report.provider_calls !== 12 + reviewCalls || report.admission_writes !== 0) throw new Error("e2e report binding mismatch");
  const scores = report.records.map((record, index) => {
    const fixture = control.fixture[index];
    if (record.case_id !== fixture.case_id || record.source_sha256 !== sha256(fixture.source_text) || record.extraction.prompt_sha256 !== sha256(extractionPrompt(fixture.source_text))) throw new Error("e2e extraction binding mismatch");
    const candidate = DecisionExtraction.parse(record.extraction.candidate);
    if (record.extraction.candidate_sha256 !== sha256(canonicalJson(candidate))) throw new Error("e2e candidate hash mismatch");
    const extractionDiagnostics = inspectExtractionCandidateV2(candidate, fixture.source_text);
    let review = null;
    let reviewDiagnostics = [];
    if (record.review !== null) {
      if (candidate.decision !== "write" || record.review.prompt_sha256 !== sha256(buildGroundingReviewPrompt(fixture.source_text, candidate))) throw new Error("e2e review binding mismatch");
      review = GroundingReview.parse(record.review.output);
      if (record.review.output_sha256 !== sha256(canonicalJson(review))) throw new Error("e2e review hash mismatch");
      reviewDiagnostics = inspectGroundingReview(review, fixture.source_text, candidate);
    } else if (candidate.decision === "write") throw new Error("e2e write candidate lacks review");
    return scoreCase(control.gold[index], candidate, extractionDiagnostics, review, reviewDiagnostics);
  });
  if (canonicalJson(scores) !== canonicalJson(report.scores) || canonicalJson(summary(scores)) !== canonicalJson(report.summary)) throw new Error("e2e score replay mismatch");
  return { status: "verified-extraction-grounding-e2e-v1", summary: report.summary };
}

async function invokeAndStore({ invoke, prompt, schema, model, outputRoot, stageRoot }) {
  fs.mkdirSync(stageRoot, { recursive: true, mode: 0o700 });
  const promptFile = path.join(stageRoot, "prompt.txt");
  fs.writeFileSync(promptFile, prompt, { flag: "wx", mode: 0o600 });
  const response = await invoke(prompt, { schema, model });
  const stdoutFile = path.join(stageRoot, "stdout.jsonl");
  const stderrFile = path.join(stageRoot, "stderr.txt");
  fs.writeFileSync(stdoutFile, response.stdout, { flag: "wx", mode: 0o600 });
  fs.writeFileSync(stderrFile, response.stderr, { flag: "wx", mode: 0o600 });
  return { response, raw: { prompt: artifact(outputRoot, promptFile), stdout: artifact(outputRoot, stdoutFile), stderr: artifact(outputRoot, stderrFile) } };
}

async function collect({ fixtureFile, goldFile, model, outputRoot, invoke }) {
  if (!model || process.env.CODEX_MODEL !== model) throw new Error("model must equal explicit CODEX_MODEL");
  if (fs.existsSync(outputRoot)) throw new Error("output root already exists");
  const control = loadControl(fixtureFile, goldFile);
  const provider = invoke || require("./providers/codex").runCodexEvidence;
  const extractionSchemaFile = path.resolve("schemas/memory-extraction-v4.schema.json");
  const reviewSchemaFile = path.resolve("schemas/memory-grounding-review-v1.schema.json");
  fs.mkdirSync(outputRoot, { recursive: true, mode: 0o700 });
  const records = [];
  for (const [index, fixture] of control.fixture.entries()) {
    const caseRoot = path.join(outputRoot, "raw", fixture.case_id);
    try {
      const extractionStage = await invokeAndStore({ invoke: provider, prompt: extractionPrompt(fixture.source_text), schema: extractionSchemaFile, model, outputRoot, stageRoot: path.join(caseRoot, "extraction") });
      const candidate = DecisionExtraction.parse(JSON.parse(extractionStage.response.output_text));
      const extraction = { prompt_sha256: sha256(extractionPrompt(fixture.source_text)), candidate, candidate_sha256: sha256(canonicalJson(candidate)), usage: extractionStage.response.usage, raw: extractionStage.raw };
      let review = null;
      if (candidate.decision === "write") {
        const prompt = buildGroundingReviewPrompt(fixture.source_text, candidate);
        const reviewStage = await invokeAndStore({ invoke: provider, prompt, schema: reviewSchemaFile, model, outputRoot, stageRoot: path.join(caseRoot, "review") });
        const output = GroundingReview.parse(JSON.parse(reviewStage.response.output_text));
        review = { prompt_sha256: sha256(prompt), output, output_sha256: sha256(canonicalJson(output)), usage: reviewStage.response.usage, raw: reviewStage.raw };
      }
      records.push({ case_id: fixture.case_id, source_sha256: sha256(fixture.source_text), extraction, review });
    } catch (error) {
      fs.writeFileSync(path.join(outputRoot, "failure.json"), `${JSON.stringify({ status: "terminal-partial-run", failed_index: index, case_id: fixture.case_id, completed_cases: records.length, error: error.message }, null, 2)}\n`, { flag: "wx", mode: 0o600 });
      throw error;
    }
  }
  const scores = records.map((record, index) => {
    const fixture = control.fixture[index];
    const extractionDiagnostics = inspectExtractionCandidateV2(record.extraction.candidate, fixture.source_text);
    const reviewOutput = record.review && record.review.output;
    const reviewDiagnostics = reviewOutput ? inspectGroundingReview(reviewOutput, fixture.source_text, record.extraction.candidate) : [];
    return scoreCase(control.gold[index], record.extraction.candidate, extractionDiagnostics, reviewOutput, reviewDiagnostics);
  });
  const extractionSchema = createMemoryExtractionJsonSchema(ACTIVE_ONTOLOGY, { schemaVersion: "memory-extraction-v4", assertionEvidence: true, decisionContract: true });
  const reviewSchema = createGroundingReviewJsonSchema();
  const reviewCalls = records.filter(record => record.review !== null).length;
  const report = { schema_version: "extraction-grounding-e2e-report-v1", status: "complete-unadmitted-v1", provider: "codex", model, fixture_sha256: control.fixture_sha256, gold_sha256: control.gold_sha256, extraction_schema_sha256: sha256(canonicalJson(extractionSchema)), review_schema_sha256: sha256(canonicalJson(reviewSchema)), extraction_prompt_sha256: sha256(DECISION_EXTRACTION_INSTRUCTIONS), review_prompt_sha256: sha256(GROUNDING_REVIEW_INSTRUCTIONS), extraction_calls: 12, review_calls: reviewCalls, provider_calls: 12 + reviewCalls, admission_writes: 0, records, scores, summary: summary(scores) };
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

module.exports = { collect, expectedReviewVerdict, loadControl, scoreCase, summary, verifyReport };
if (require.main === module) (async () => {
  const args = parseArgs(process.argv.slice(2));
  if (!args.allowLiveProvider) return process.stdout.write(`${JSON.stringify({ status: "offline-no-default-provider", provider_calls: 0, admission_writes: 0 })}\n`);
  if (!args.fixture || !args.gold || !args.model || !args.output_root) throw new Error("live gates are incomplete");
  const report = await collect({ fixtureFile: path.resolve(args.fixture), goldFile: path.resolve(args.gold), model: args.model, outputRoot: path.resolve(args.output_root) });
  process.stdout.write(`${JSON.stringify({ status: report.status, summary: report.summary })}\n`);
})().catch(error => { console.error(error.message); process.exitCode = 1; });
