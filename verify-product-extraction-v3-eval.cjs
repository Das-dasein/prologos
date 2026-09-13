"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { ADMISSION_EXTRACTION_INSTRUCTIONS, createMemoryExtractionJsonSchema } = require("./llm-schema");
const { ACTIVE_ONTOLOGY, canonicalJson } = require("./ontology-registry");
const { DATASET_SHA256, validateDataset } = require("./cdr-annotation-harness");
const { loadFixture, verifyReport } = require("./product-extraction-v3-eval.cjs");

const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const reportFile = process.argv[2];
const fixtureFile = process.argv[3];
const goldFile = process.argv[4];

try {
  if (!reportFile || !fixtureFile || !goldFile) throw new Error("usage: node verify-product-extraction-v3-eval.cjs REPORT FIXTURE GOLD");
  const resolvedReport = path.resolve(reportFile);
  const root = path.dirname(resolvedReport);
  const report = JSON.parse(fs.readFileSync(resolvedReport, "utf8"));
  const fixture = loadFixture(path.resolve(fixtureFile));
  validateDataset(path.resolve(goldFile), DATASET_SHA256);
  const goldRows = fs.readFileSync(path.resolve(goldFile), "utf8").trim().split(/\r?\n/).map(JSON.parse);
  if (report.fixture_sha256 !== fixture.sha256 || report.gold_sha256 !== DATASET_SHA256) throw new Error("dataset hash mismatch");
  const schema = createMemoryExtractionJsonSchema(ACTIVE_ONTOLOGY, { schemaVersion: "memory-extraction-v3", assertionEvidence: true });
  if (report.schema_sha256 !== sha256(canonicalJson(schema)) || report.prompt_contract_sha256 !== sha256(ADMISSION_EXTRACTION_INSTRUCTIONS)) throw new Error("contract hash mismatch");
  for (const record of report.records) {
    for (const item of Object.values(record.raw)) {
      const file = path.resolve(root, item.path);
      const relative = path.relative(root, file);
      if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("raw artifact escapes report root");
      if (!fs.statSync(file).isFile() || fs.statSync(file).size !== item.bytes || sha256(fs.readFileSync(file)) !== item.sha256) throw new Error("raw artifact integrity mismatch");
    }
  }
  process.stdout.write(`${JSON.stringify(verifyReport(report, fixture.rows, goldRows))}\n`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
