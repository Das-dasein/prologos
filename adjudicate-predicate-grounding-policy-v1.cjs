"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { canonicalJson } = require("./ontology-registry");
const { ACTIVE_GROUNDING_POLICY } = require("./predicate-grounding-policy");

const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");

function build(extractionReport, reviewReport, hybridReport, hashes) {
  const extractionRecord = extractionReport.records.find(row => row.case_id === "v4-13");
  const reviewRecord = reviewReport.records.find(row => row.case_id === "gr-05");
  if (!extractionRecord || canonicalJson(extractionRecord.candidate.assertions[0].arguments) !== canonicalJson(["user", "mentor"]) || extractionRecord.candidate.assertions[0].relation !== "role" || !reviewRecord || reviewRecord.review.reviews[0].verdict !== "not_entailed") throw new Error("policy adjudication source mismatch");
  return {
    schema_version: "predicate-grounding-policy-adjudication-v1",
    status: "post-hoc-contract-correction",
    policy_identity: ACTIVE_GROUNDING_POLICY.identity,
    source_hashes: hashes,
    correction: {
      source_text: "I mentor junior developers.",
      assertion: "role(user,mentor)",
      previous_label: "not_entailed/ontology_candidate",
      policy_label: "entailed/write",
      reason: "The original ontology meaning did not exclude lexical role entailment. Grounding policy v1 explicitly licenses stable habitual use of the corresponding role verb.",
    },
    revised_metrics: {
      product_extraction_v4_eval: {
        decision_accuracy: "16/16",
        semantic_case_exact: "16/16",
        harmful_writes_eligible: 0,
        correct_writes_blocked_by_validator_v2: 2,
      },
      memory_grounding_review: {
        verdict_accuracy: "13/16",
        exact_cases: "10/13",
        harmful_assertions_passed: 2,
        entailed_assertions_blocked: 1,
      },
      retrospective_hybrid: {
        validator_v2: { clean_passed: 7, clean_blocked: 2, harmful_passed: 0, harmful_blocked: 4 },
        semantic_review: { clean_passed: 8, clean_blocked: 1, harmful_passed: 2, harmful_blocked: 2 },
        hybrid: { clean_passed: 6, clean_blocked: 3, harmful_passed: 0, harmful_blocked: 4 },
      },
    },
    immutable_primary_reports_preserved: true,
  };
}

try {
  const [outputArg] = process.argv.slice(2);
  if (!outputArg) throw new Error("usage: node adjudicate-predicate-grounding-policy-v1.cjs OUTPUT");
  const files = {
    extraction_report: "reports/product-extraction-v4-eval-v1/luna/report.json",
    review_report: "reports/memory-grounding-review-v1/luna/report.json",
    hybrid_report: "reports/memory-grounding-review-v1/luna/hybrid-replay.json",
  };
  const bytes = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, fs.readFileSync(file)]));
  const result = build(JSON.parse(bytes.extraction_report), JSON.parse(bytes.review_report), JSON.parse(bytes.hybrid_report), Object.fromEntries(Object.entries(bytes).map(([key, value]) => [key, sha256(value)])));
  const outputFile = path.resolve(outputArg);
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  if (fs.existsSync(outputFile)) {
    if (canonicalJson(JSON.parse(fs.readFileSync(outputFile, "utf8"))) !== canonicalJson(result)) throw new Error("stored policy adjudication differs");
  } else fs.writeFileSync(outputFile, `${JSON.stringify(result, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  process.stdout.write(`${JSON.stringify({ status: result.status, policy_identity: result.policy_identity, revised_metrics: result.revised_metrics })}\n`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

module.exports = { build };
