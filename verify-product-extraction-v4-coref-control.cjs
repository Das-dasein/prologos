"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { DECISION_EXTRACTION_INSTRUCTIONS, createMemoryExtractionJsonSchema } = require("./llm-schema");
const { ACTIVE_ONTOLOGY, canonicalJson } = require("./ontology-registry");
const { loadControl, verifyReport } = require("./product-extraction-v4-coref-control.cjs");

const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");

try {
  const [reportArg, fixtureArg, goldArg] = process.argv.slice(2);
  if (!reportArg || !fixtureArg || !goldArg) throw new Error("usage: node verify-product-extraction-v4-coref-control.cjs REPORT FIXTURE GOLD");
  const reportFile = path.resolve(reportArg);
  const root = path.dirname(reportFile);
  const report = JSON.parse(fs.readFileSync(reportFile, "utf8"));
  const control = loadControl(path.resolve(fixtureArg), path.resolve(goldArg));
  const schema = createMemoryExtractionJsonSchema(ACTIVE_ONTOLOGY, { schemaVersion: "memory-extraction-v4", assertionEvidence: true, decisionContract: true });
  if (report.schema_sha256 !== sha256(canonicalJson(schema)) || report.prompt_contract_sha256 !== sha256(DECISION_EXTRACTION_INSTRUCTIONS)) throw new Error("v4 coreference control contract hash mismatch");
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
