"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { canonicalJson } = require("./ontology-registry");
const { GROUNDING_REVIEW_INSTRUCTIONS, createGroundingReviewJsonSchema } = require("./grounding-review");
const { loadControl, verifyReport } = require("./grounding-review-eval.cjs");

const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");

try {
  const [reportArg, fixtureArg, goldArg] = process.argv.slice(2);
  if (!reportArg || !fixtureArg || !goldArg) throw new Error("usage: node verify-grounding-review-eval.cjs REPORT FIXTURE GOLD");
  const reportFile = path.resolve(reportArg);
  const root = path.dirname(reportFile);
  const report = JSON.parse(fs.readFileSync(reportFile, "utf8"));
  const control = loadControl(path.resolve(fixtureArg), path.resolve(goldArg));
  if (report.schema_sha256 !== sha256(canonicalJson(createGroundingReviewJsonSchema())) || report.prompt_contract_sha256 !== sha256(GROUNDING_REVIEW_INSTRUCTIONS)) throw new Error("grounding contract hash mismatch");
  for (const record of report.records) {
    for (const raw of Object.values(record.raw)) {
      const file = path.resolve(root, raw.path);
      const relative = path.relative(root, file);
      if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("raw path escapes report root");
      if (!fs.statSync(file).isFile() || fs.statSync(file).size !== raw.bytes || sha256(fs.readFileSync(file)) !== raw.sha256) throw new Error("raw artifact integrity mismatch");
    }
  }
  process.stdout.write(`${JSON.stringify(verifyReport(report, control))}\n`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
