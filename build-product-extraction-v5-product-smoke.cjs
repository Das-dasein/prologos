"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { ACTIVE_ONTOLOGY, canonicalJson } = require("./ontology-registry");
const { ACTIVE_GROUNDING_POLICY } = require("./predicate-grounding-policy");
const { ACTIVE_EXTRACTION_ADMISSION_POLICY } = require("./extraction-admission-policy");

const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");

function build(outputRoot) {
  if (fs.existsSync(outputRoot)) throw new Error("product v5 smoke root already exists");
  fs.mkdirSync(outputRoot, { recursive: true, mode: 0o700 });
  const fixture = {
    schema_version: "product-extraction-v5-product-smoke-fixture-v1",
    case_id: "product-v5-smoke-01",
    source_text: "Я знаю Python.",
    expected_relation: "knows_technology",
    expected_arguments: ["user", "python"],
    ontology_identity: ACTIVE_ONTOLOGY.identity,
    grounding_policy_identity: ACTIVE_GROUNDING_POLICY.identity,
    admission_policy_identity: ACTIVE_EXTRACTION_ADMISSION_POLICY.identity,
  };
  const fixtureText = `${JSON.stringify(fixture, null, 2)}\n`;
  fs.writeFileSync(path.join(outputRoot, "fixture.json"), fixtureText, { flag: "wx", mode: 0o600 });
  const control = {
    schema_version: "product-extraction-v5-product-smoke-control-v1",
    fixture_sha256: sha256(fixtureText),
    fixture_semantic_sha256: sha256(canonicalJson(fixture)),
    provider_calls: 1,
    admission_writes: 0,
  };
  fs.writeFileSync(path.join(outputRoot, "control.json"), `${JSON.stringify(control, null, 2)}\n`, { flag: "wx", mode: 0o600 });
}

if (require.main === module) {
  if (!process.argv[2]) throw new Error("usage: node build-product-extraction-v5-product-smoke.cjs OUTPUT_ROOT");
  build(path.resolve(process.argv[2]));
}

module.exports = { build };
