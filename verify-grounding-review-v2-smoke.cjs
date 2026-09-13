"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { loadFixture, verifyReport } = require("./grounding-review-v2-smoke.cjs");

const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");

try {
  const [reportArg, fixtureArg] = process.argv.slice(2);
  if (!reportArg || !fixtureArg) throw new Error("usage: node verify-grounding-review-v2-smoke.cjs REPORT FIXTURE");
  const reportFile = path.resolve(reportArg);
  const root = path.dirname(reportFile);
  const report = JSON.parse(fs.readFileSync(reportFile, "utf8"));
  const fixture = loadFixture(path.resolve(fixtureArg));
  if (report.review_sha256 !== sha256(require("./ontology-registry").canonicalJson(report.review))) throw new Error("review-v2 output hash mismatch");
  if (!report.usage || !["input_tokens", "cached_input_tokens", "output_tokens"].every(key => Number.isInteger(report.usage[key]) && report.usage[key] >= 0)) throw new Error("review-v2 usage mismatch");
  for (const raw of Object.values(report.raw)) {
    const file = path.resolve(root, raw.path);
    const relative = path.relative(root, file);
    if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("raw path escapes report root");
    if (!fs.statSync(file).isFile() || fs.statSync(file).size !== raw.bytes || sha256(fs.readFileSync(file)) !== raw.sha256) throw new Error("raw artifact integrity mismatch");
  }
  process.stdout.write(`${JSON.stringify(verifyReport(report, fixture))}\n`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
