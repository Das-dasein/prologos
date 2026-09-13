"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { canonicalJson } = require("./ontology-registry");
const { ACTIVE_GROUNDING_POLICY } = require("./predicate-grounding-policy");

const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const ATOM = /^[a-z][a-z0-9_]*$/;
const VERSION = /^[0-9]+\.[0-9]+\.[0-9]+$/;
const expectedValidators = ["schema_evidence_interval_v1", "third_person_pronoun_subject_v2", "non_ascii_identity_binding_v1"];
const expectedIdentityTypes = ["person", "organization", "place", "technology", "project"];
const expectedClarifications = ["unresolved_pronoun_subject", "ambiguous_pronoun_subject", "unadmitted_non_ascii_identity"];

function exact(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value) || canonicalJson(Object.keys(value).sort()) !== canonicalJson([...keys].sort())) throw new Error(`${label} shape mismatch`);
}

const supportedVersions = {
  "extraction-admission-policy-v1": { identityVersion: "1.0.0", candidateSchema: "memory-extraction-v4" },
  "extraction-admission-policy-v2": { identityVersion: "2.0.0", candidateSchema: "memory-extraction-v5" },
};

function loadExtractionAdmissionPolicy(file = path.join(__dirname, "policies", "extraction-admission-policy-v2.json")) {
  const policy = JSON.parse(fs.readFileSync(file, "utf8"));
  exact(policy, ["schema_version", "identity", "grounding_policy_identity", "accepted_candidate_schema", "validators", "identity_argument_types", "clarification_diagnostics"], "extraction admission policy");
  exact(policy.identity, ["name", "version"], "extraction admission policy identity");
  const supported = supportedVersions[policy.schema_version];
  if (!supported || policy.identity.name !== "product_extraction_admission" || policy.identity.version !== supported.identityVersion || !ATOM.test(policy.identity.name) || !VERSION.test(policy.identity.version)) throw new Error("invalid extraction admission policy identity");
  if (canonicalJson(policy.grounding_policy_identity) !== canonicalJson(ACTIVE_GROUNDING_POLICY.identity)) throw new Error("extraction admission grounding policy mismatch");
  if (policy.accepted_candidate_schema !== supported.candidateSchema || canonicalJson(policy.validators) !== canonicalJson(expectedValidators) || canonicalJson(policy.identity_argument_types) !== canonicalJson(expectedIdentityTypes) || canonicalJson(policy.clarification_diagnostics) !== canonicalJson(expectedClarifications)) throw new Error("unsupported extraction admission policy pipeline");
  return Object.freeze({ ...policy, identity: Object.freeze({ ...policy.identity, sha256: sha256(canonicalJson(policy)) }) });
}

const EXTRACTION_ADMISSION_POLICY_V1 = loadExtractionAdmissionPolicy(path.join(__dirname, "policies", "extraction-admission-policy-v1.json"));
const ACTIVE_EXTRACTION_ADMISSION_POLICY = loadExtractionAdmissionPolicy();
const EXTRACTION_ADMISSION_POLICIES = Object.freeze([EXTRACTION_ADMISSION_POLICY_V1, ACTIVE_EXTRACTION_ADMISSION_POLICY]);

function extractionAdmissionPolicyForSchema(schemaVersion) {
  const policy = EXTRACTION_ADMISSION_POLICIES.find(candidate => candidate.accepted_candidate_schema === schemaVersion);
  if (!policy) throw new Error(`no extraction admission policy for ${schemaVersion}`);
  return policy;
}

function resolveExtractionAdmissionPolicy(identity) {
  const policy = EXTRACTION_ADMISSION_POLICIES.find(candidate => canonicalJson(candidate.identity) === canonicalJson(identity));
  if (!policy) throw new Error("admission policy identity mismatch");
  return policy;
}

module.exports = { ACTIVE_EXTRACTION_ADMISSION_POLICY, EXTRACTION_ADMISSION_POLICY_V1, EXTRACTION_ADMISSION_POLICIES, extractionAdmissionPolicyForSchema, loadExtractionAdmissionPolicy, resolveExtractionAdmissionPolicy, sha256 };
