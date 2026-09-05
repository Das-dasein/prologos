#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const z = require("zod");

const ROOT = __dirname;
const schemaPath = path.join(ROOT, "schemas/offline-eval-v3.schema.json");
const artifactPath = process.argv[2] || path.join(ROOT, "reports/live-20260905-152059/replay-v3-r2.json");

const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
const validator = z.fromJSONSchema(schema);

validator.parse(artifact);
console.log(`offline-eval-v3 schema: PASS (${path.relative(ROOT, artifactPath)})`);

if (require.main === module) {
  const invalid = { ...artifact, __unexpected_schema_field: true };
  try {
    validator.parse(invalid);
  } catch (error) {
    console.log("offline-eval-v3 schema negative: PASS (additional property rejected)");
    process.exit(0);
  }
  console.error("offline-eval-v3 schema negative: FAIL (additional property accepted)");
  process.exit(1);
}

module.exports = { schemaPath, artifactPath, validator };
