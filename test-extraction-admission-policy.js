"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { ACTIVE_GROUNDING_POLICY } = require("./predicate-grounding-policy");
const {
  ACTIVE_EXTRACTION_ADMISSION_POLICY,
  EXTRACTION_ADMISSION_POLICY_V1,
  extractionAdmissionPolicyForSchema,
  loadExtractionAdmissionPolicy,
  resolveExtractionAdmissionPolicy,
} = require("./extraction-admission-policy");

assert.equal(ACTIVE_EXTRACTION_ADMISSION_POLICY.schema_version, "extraction-admission-policy-v2");
assert.equal(ACTIVE_EXTRACTION_ADMISSION_POLICY.accepted_candidate_schema, "memory-extraction-v5");
assert.equal(ACTIVE_EXTRACTION_ADMISSION_POLICY.identity.sha256.length, 64);
assert.deepEqual(ACTIVE_EXTRACTION_ADMISSION_POLICY.grounding_policy_identity, ACTIVE_GROUNDING_POLICY.identity);
assert.deepEqual(ACTIVE_EXTRACTION_ADMISSION_POLICY.validators, ["schema_evidence_interval_v1", "third_person_pronoun_subject_v2", "non_ascii_identity_binding_v1"]);
assert.equal(EXTRACTION_ADMISSION_POLICY_V1.schema_version, "extraction-admission-policy-v1");
assert.equal(EXTRACTION_ADMISSION_POLICY_V1.accepted_candidate_schema, "memory-extraction-v4");
assert.notEqual(EXTRACTION_ADMISSION_POLICY_V1.identity.sha256, ACTIVE_EXTRACTION_ADMISSION_POLICY.identity.sha256);
assert.equal(extractionAdmissionPolicyForSchema("memory-extraction-v4"), EXTRACTION_ADMISSION_POLICY_V1);
assert.equal(extractionAdmissionPolicyForSchema("memory-extraction-v5"), ACTIVE_EXTRACTION_ADMISSION_POLICY);
assert.equal(resolveExtractionAdmissionPolicy(EXTRACTION_ADMISSION_POLICY_V1.identity), EXTRACTION_ADMISSION_POLICY_V1);
assert.equal(resolveExtractionAdmissionPolicy(ACTIVE_EXTRACTION_ADMISSION_POLICY.identity), ACTIVE_EXTRACTION_ADMISSION_POLICY);
assert.throws(() => extractionAdmissionPolicyForSchema("memory-extraction-v6"), /no extraction admission policy/);

const root = fs.mkdtempSync(path.join(os.tmpdir(), "pam-admission-policy-"));
const source = JSON.parse(fs.readFileSync(path.join(__dirname, "policies", "extraction-admission-policy-v1.json"), "utf8"));
source.grounding_policy_identity.sha256 = "0".repeat(64);
const stale = path.join(root, "stale.json");
fs.writeFileSync(stale, JSON.stringify(source));
assert.throws(() => loadExtractionAdmissionPolicy(stale), /grounding policy mismatch/);

console.log("extraction admission policy ok: v4 and v5 pipelines are content-addressed and replayable");
