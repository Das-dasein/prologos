"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { ACTIVE_ONTOLOGY, canonicalJson } = require("./ontology-registry");
const { ACTIVE_GROUNDING_POLICY } = require("./predicate-grounding-policy");
const {
  GroundingReviewV2,
  buildGroundingReviewV2Prompt,
  createGroundingReviewV2JsonSchema,
  inspectGroundingReviewV2,
  sha256,
} = require("./grounding-review");

const source = "I mentor junior developers.";
const candidate = {
  schema_version: "memory-extraction-v4",
  registry_identity: ACTIVE_ONTOLOGY.identity,
  decision: "write",
  clarification: null,
  assertions: [{ polarity: "positive", relation: "role", arguments: ["user", "mentor"], valid_from: null, valid_to: null, confidence: 0.99, evidence_span: source }],
  ontology_candidates: [],
};
const review = {
  schema_version: "memory-grounding-review-v2",
  candidate_sha256: sha256(canonicalJson(candidate)),
  policy_identity: ACTIVE_GROUNDING_POLICY.identity,
  reviews: [{ assertion_index: 0, verdict: "entailed", evidence_span: source, reason: "Habitual role verb is licensed by the bound policy" }],
};

assert.deepEqual(GroundingReviewV2.parse(review), review);
assert.deepEqual(JSON.parse(fs.readFileSync(path.join(__dirname, "schemas/memory-grounding-review-v2.schema.json"), "utf8")), createGroundingReviewV2JsonSchema());
assert.deepEqual(inspectGroundingReviewV2(review, source, candidate), []);
assert.match(buildGroundingReviewV2Prompt(source, candidate), new RegExp(ACTIVE_GROUNDING_POLICY.identity.sha256));
assert.equal(inspectGroundingReviewV2({ ...review, candidate_sha256: "0".repeat(64) }, source, candidate)[0].code, "candidate_hash_mismatch");
assert.equal(inspectGroundingReviewV2({ ...review, policy_identity: { ...review.policy_identity, sha256: "0".repeat(64) } }, source, candidate)[0].code, "schema_invalid");
console.log("grounding review v2 ok: candidate and predicate policy identities are both bound");
