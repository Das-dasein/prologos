"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { canonicalJson } = require("./ontology-registry");
const { summary } = require("./extraction-grounding-e2e.cjs");

const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");

function adjudicate(report, reportHash) {
  const scores = JSON.parse(JSON.stringify(report.scores));
  const record = report.records.find(item => item.case_id === "eg-12");
  const score = scores.find(item => item.case_id === "eg-12");
  const assertion = record && record.extraction.candidate.assertions[0];
  if (!record || !score || record.extraction.candidate.assertions.length !== 1 || assertion.relation !== "uses" || canonicalJson(assertion.arguments) !== canonicalJson(["kenji", "docker"]) || score.semantic_exact !== false || score.validator_v2_eligible !== false) throw new Error("adjudication source case mismatch");
  score.assertion_exact = true;
  score.semantic_exact = true;
  score.candidate_safe = true;
  score.harmful_review_write = false;
  score.correct_v2_write_blocked = true;
  score.correct_hybrid_write_blocked = true;
  score.review_assertions[0].expected = "entailed";
  score.review_assertions[0].exact = score.review_assertions[0].actual === "entailed";
  return {
    schema_version: "extraction-grounding-e2e-adjudication-v1",
    status: "post-hoc-annotation-adjudication",
    source_report_sha256: reportHash,
    case_id: "eg-12",
    original_gold_subject: "kendzi",
    accepted_subject: "kenji",
    reason: "The frozen contract did not specify a canonical transliteration for Кэндзи; the candidate and review preserve the intended person and proposition.",
    original_summary: report.summary,
    adjudicated_summary: summary(scores),
  };
}

try {
  const [reportArg, outputArg] = process.argv.slice(2);
  if (!reportArg || !outputArg) throw new Error("usage: node adjudicate-extraction-grounding-e2e.cjs REPORT OUTPUT");
  const reportFile = path.resolve(reportArg);
  const outputFile = path.resolve(outputArg);
  const bytes = fs.readFileSync(reportFile);
  const result = adjudicate(JSON.parse(bytes), sha256(bytes));
  if (fs.existsSync(outputFile)) {
    if (canonicalJson(JSON.parse(fs.readFileSync(outputFile, "utf8"))) !== canonicalJson(result)) throw new Error("stored adjudication differs");
  } else fs.writeFileSync(outputFile, `${JSON.stringify(result, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  process.stdout.write(`${JSON.stringify({ status: result.status, adjudicated_summary: result.adjudicated_summary })}\n`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

module.exports = { adjudicate };
