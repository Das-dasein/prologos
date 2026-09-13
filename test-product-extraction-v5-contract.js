"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { ACTIVE_ONTOLOGY } = require("./ontology-registry");
const { ACTIVE_GROUNDING_POLICY } = require("./predicate-grounding-policy");
const { inspectExtractionCandidate } = require("./extraction-admission");
const { validateExtraction } = require("./memory-store");
const {
  DecisionExtraction,
  PolicyDecisionExtraction,
  POLICY_DECISION_EXTRACTION_INSTRUCTIONS,
  createMemoryExtractionJsonSchema,
} = require("./llm-schema");

const candidate = {
  schema_version: "memory-extraction-v5",
  registry_identity: ACTIVE_ONTOLOGY.identity,
  policy_identity: ACTIVE_GROUNDING_POLICY.identity,
  decision: "write",
  clarification: null,
  assertions: [{
    polarity: "positive",
    relation: "role",
    arguments: ["user", "mentor"],
    valid_from: null,
    valid_to: null,
    confidence: 0.99,
    evidence_span: "I mentor junior developers every week.",
  }],
  ontology_candidates: [],
};

assert.deepEqual(PolicyDecisionExtraction.parse(candidate), candidate);
assert.deepEqual(validateExtraction(candidate), candidate);
assert.deepEqual(inspectExtractionCandidate(candidate, "I mentor junior developers every week."), []);
assert.throws(() => validateExtraction({ ...candidate, policy_identity: { ...ACTIVE_GROUNDING_POLICY.identity, sha256: "0".repeat(64) } }), /Grounding policy identity mismatch/);
assert.throws(() => PolicyDecisionExtraction.parse({ ...candidate, policy_identity: undefined }));
assert.throws(() => PolicyDecisionExtraction.parse({ ...candidate, policy_identity: { ...ACTIVE_GROUNDING_POLICY.identity, sha256: "0".repeat(64) } }));
assert.throws(() => DecisionExtraction.parse(candidate));
assert.match(POLICY_DECISION_EXTRACTION_INSTRUCTIONS, new RegExp(ACTIVE_GROUNDING_POLICY.identity.sha256));
assert.match(POLICY_DECISION_EXTRACTION_INSTRUCTIONS, /one isolated action/);
assert.deepEqual(
  JSON.parse(fs.readFileSync(path.join(__dirname, "schemas", "memory-extraction-v5.schema.json"), "utf8")),
  createMemoryExtractionJsonSchema(ACTIVE_ONTOLOGY, {
    schemaVersion: "memory-extraction-v5",
    assertionEvidence: true,
    decisionContract: true,
    groundingPolicy: ACTIVE_GROUNDING_POLICY,
  }),
);

console.log("product extraction v5 contract ok: ontology and predicate policy identities are exact and mandatory");
