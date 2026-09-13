"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { ACTIVE_ONTOLOGY, canonicalJson } = require("./ontology-registry");
const { ACTIVE_GROUNDING_POLICY } = require("./predicate-grounding-policy");
const { DECISION_EXTRACTION_INSTRUCTIONS, POLICY_DECISION_EXTRACTION_INSTRUCTIONS, createMemoryExtractionJsonSchema } = require("./llm-schema");
const { loadControl, verifyReport } = require("./product-extraction-v4-v5-paired-eval.cjs");

const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");

try {
  const [reportArg, fixtureArg, goldArg] = process.argv.slice(2);
  if (!reportArg || !fixtureArg || !goldArg) throw new Error("usage: node verify-product-extraction-v4-v5-paired.cjs REPORT FIXTURE GOLD");
  const reportFile = path.resolve(reportArg);
  const root = path.dirname(reportFile);
  const report = JSON.parse(fs.readFileSync(reportFile, "utf8"));
  const control = loadControl(path.resolve(fixtureArg), path.resolve(goldArg));
  const schemas = {
    v4: createMemoryExtractionJsonSchema(ACTIVE_ONTOLOGY, { schemaVersion: "memory-extraction-v4", assertionEvidence: true, decisionContract: true }),
    v5: createMemoryExtractionJsonSchema(ACTIVE_ONTOLOGY, { schemaVersion: "memory-extraction-v5", assertionEvidence: true, decisionContract: true, groundingPolicy: ACTIVE_GROUNDING_POLICY }),
  };
  const expectedSchemaHashes = Object.fromEntries(Object.entries(schemas).map(([name, schema]) => [name, sha256(canonicalJson(schema))]));
  const expectedPromptHashes = { v4: sha256(DECISION_EXTRACTION_INSTRUCTIONS), v5: sha256(POLICY_DECISION_EXTRACTION_INSTRUCTIONS) };
  if (canonicalJson(report.schema_hashes) !== canonicalJson(expectedSchemaHashes) || canonicalJson(report.prompt_contract_hashes) !== canonicalJson(expectedPromptHashes)) throw new Error("paired extraction contract hash mismatch");
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
