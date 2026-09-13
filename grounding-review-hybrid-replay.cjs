"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { canonicalJson } = require("./ontology-registry");
const { inspectExtractionCandidateV2 } = require("./extraction-admission");

const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const readJsonl = file => fs.readFileSync(file, "utf8").trim().split(/\r?\n/).map(JSON.parse);

function calculate(report, fixture, gold, bindings) {
  const records = report.records.map((record, index) => {
    const candidate = fixture[index].candidate;
    const expectedEligible = gold[index].reviews.every(item => item.verdict === "entailed");
    const v2Diagnostics = inspectExtractionCandidateV2(candidate, fixture[index].source_text);
    const v2Eligible = v2Diagnostics.length === 0;
    const reviewEligible = record.review.reviews.every(item => item.verdict === "entailed") && report.scores[index].diagnostics.length === 0;
    return {
      case_id: fixture[index].case_id,
      expected_eligible: expectedEligible,
      validator_v2_eligible: v2Eligible,
      review_eligible: reviewEligible,
      hybrid_eligible: v2Eligible && reviewEligible,
      validator_v2_diagnostics: v2Diagnostics,
    };
  });
  const metrics = key => ({
    clean_candidates_passed: records.filter(row => row.expected_eligible && row[key]).length,
    clean_candidates_blocked: records.filter(row => row.expected_eligible && !row[key]).length,
    harmful_candidates_passed: records.filter(row => !row.expected_eligible && row[key]).length,
    harmful_candidates_blocked: records.filter(row => !row.expected_eligible && !row[key]).length,
  });
  return {
    schema_version: "memory-grounding-review-hybrid-replay-v1",
    status: "retrospective-diagnostic-only",
    report_sha256: bindings.report_sha256,
    fixture_sha256: bindings.fixture_sha256,
    gold_sha256: bindings.gold_sha256,
    validator_source_sha256: bindings.validator_source_sha256,
    cases: records.length,
    expected_clean_candidates: records.filter(row => row.expected_eligible).length,
    expected_harmful_candidates: records.filter(row => !row.expected_eligible).length,
    validator_v2: metrics("validator_v2_eligible"),
    semantic_review: metrics("review_eligible"),
    hybrid: metrics("hybrid_eligible"),
    records,
  };
}

function main(argv) {
  const [reportArg, fixtureArg, goldArg, outputArg] = argv;
  if (!reportArg || !fixtureArg || !goldArg || !outputArg) throw new Error("usage: node grounding-review-hybrid-replay.cjs REPORT FIXTURE GOLD OUTPUT");
  const reportFile = path.resolve(reportArg);
  const fixtureFile = path.resolve(fixtureArg);
  const goldFile = path.resolve(goldArg);
  const outputFile = path.resolve(outputArg);
  const legacyValidatorSource = path.resolve(".cdr/waves/extraction-grounding-e2e-v1/extraction-admission-v2-product.source.js");
  const report = JSON.parse(fs.readFileSync(reportFile, "utf8"));
  const fixture = readJsonl(fixtureFile);
  const gold = readJsonl(goldFile);
  const result = calculate(report, fixture, gold, {
    report_sha256: sha256(fs.readFileSync(reportFile)),
    fixture_sha256: sha256(fs.readFileSync(fixtureFile)),
    gold_sha256: sha256(fs.readFileSync(goldFile)),
    validator_source_sha256: sha256(fs.readFileSync(legacyValidatorSource)),
  });
  if (fs.existsSync(outputFile)) {
    if (canonicalJson(JSON.parse(fs.readFileSync(outputFile, "utf8"))) !== canonicalJson(result)) throw new Error("stored hybrid replay differs");
  } else {
    fs.writeFileSync(outputFile, `${JSON.stringify(result, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  }
  process.stdout.write(`${JSON.stringify({ status: result.status, cases: result.cases, validator_v2: result.validator_v2, semantic_review: result.semantic_review, hybrid: result.hybrid })}\n`);
}

module.exports = { calculate };
if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
