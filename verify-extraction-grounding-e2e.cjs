"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { DecisionExtraction, DECISION_EXTRACTION_INSTRUCTIONS, createMemoryExtractionJsonSchema } = require("./llm-schema");
const { ACTIVE_ONTOLOGY, canonicalJson } = require("./ontology-registry");
const { GroundingReview, GROUNDING_REVIEW_INSTRUCTIONS, createGroundingReviewJsonSchema } = require("./grounding-review");
const { loadControl, verifyReport } = require("./extraction-grounding-e2e.cjs");

const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");

try {
  const [reportArg, fixtureArg, goldArg] = process.argv.slice(2);
  if (!reportArg || !fixtureArg || !goldArg) throw new Error("usage: node verify-extraction-grounding-e2e.cjs REPORT FIXTURE GOLD");
  const reportFile = path.resolve(reportArg);
  const root = path.dirname(reportFile);
  const report = JSON.parse(fs.readFileSync(reportFile, "utf8"));
  const control = loadControl(path.resolve(fixtureArg), path.resolve(goldArg));
  const extractionSchema = createMemoryExtractionJsonSchema(ACTIVE_ONTOLOGY, { schemaVersion: "memory-extraction-v4", assertionEvidence: true, decisionContract: true });
  if (report.extraction_schema_sha256 !== sha256(canonicalJson(extractionSchema)) || report.review_schema_sha256 !== sha256(canonicalJson(createGroundingReviewJsonSchema())) || report.extraction_prompt_sha256 !== sha256(DECISION_EXTRACTION_INSTRUCTIONS) || report.review_prompt_sha256 !== sha256(GROUNDING_REVIEW_INSTRUCTIONS)) throw new Error("e2e contract hash mismatch");
  for (const record of report.records) {
    DecisionExtraction.parse(record.extraction.candidate);
    const stages = [record.extraction, ...(record.review ? [record.review] : [])];
    for (const stage of stages) {
      if (!stage.usage || !["input_tokens", "cached_input_tokens", "output_tokens"].every(key => Number.isInteger(stage.usage[key]) && stage.usage[key] >= 0)) throw new Error("e2e usage mismatch");
      for (const raw of Object.values(stage.raw)) {
        const file = path.resolve(root, raw.path);
        const relative = path.relative(root, file);
        if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("raw path escapes report root");
        if (!fs.statSync(file).isFile() || fs.statSync(file).size !== raw.bytes || sha256(fs.readFileSync(file)) !== raw.sha256) throw new Error("raw artifact integrity mismatch");
      }
    }
    if (record.review) GroundingReview.parse(record.review.output);
  }
  process.stdout.write(`${JSON.stringify(verifyReport(report, control))}\n`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
