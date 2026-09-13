"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { ACTIVE_ONTOLOGY, canonicalJson } = require("./ontology-registry");

const ATOM = /^[a-z][a-z0-9_]*$/;
const VERSION = /^[0-9]+\.[0-9]+\.[0-9]+$/;
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");

function exact(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  if (canonicalJson(Object.keys(value).sort()) !== canonicalJson([...keys].sort())) throw new Error(`${label} shape mismatch`);
}

function loadPredicateGroundingPolicy(file = path.join(__dirname, "ontology", "predicate-grounding-policy-v1.json"), ontology = ACTIVE_ONTOLOGY) {
  const policy = JSON.parse(fs.readFileSync(file, "utf8"));
  exact(policy, ["schema_version", "identity", "ontology_identity", "default_rule", "normalization_rule", "overrides"], "grounding policy");
  if (policy.schema_version !== "predicate-grounding-policy-v1") throw new Error("unsupported grounding policy schema");
  exact(policy.identity, ["name", "version"], "grounding policy identity");
  if (!ATOM.test(policy.identity.name) || !VERSION.test(policy.identity.version)) throw new Error("invalid grounding policy identity");
  exact(policy.ontology_identity, ["name", "version", "sha256"], "grounding policy ontology identity");
  if (canonicalJson(policy.ontology_identity) !== canonicalJson(ontology.identity)) throw new Error("grounding policy ontology identity mismatch");
  if (!policy.default_rule.trim() || !policy.normalization_rule.trim() || !Array.isArray(policy.overrides)) throw new Error("invalid grounding policy content");
  const seen = new Set();
  policy.overrides.forEach((entry, index) => {
    exact(entry, ["predicate", "license", "excludes"], `grounding override ${index}`);
    if (!ontology.predicates[entry.predicate] || seen.has(entry.predicate) || typeof entry.license !== "string" || !entry.license.trim() || !Array.isArray(entry.excludes) || entry.excludes.some(value => typeof value !== "string" || !value.trim())) throw new Error(`invalid grounding override ${index}`);
    seen.add(entry.predicate);
  });
  const body = { ...policy };
  const identity = Object.freeze({ ...policy.identity, sha256: sha256(canonicalJson(body)) });
  return Object.freeze({ ...policy, identity });
}

function groundingPolicyGuide(policy = ACTIVE_GROUNDING_POLICY) {
  return [
    `Policy ${policy.identity.name}@${policy.identity.version} sha256:${policy.identity.sha256}`,
    `Default: ${policy.default_rule}`,
    `Normalization: ${policy.normalization_rule}`,
    ...policy.overrides.map(entry => `${entry.predicate}: ${entry.license} Excludes: ${entry.excludes.join("; ")}.`),
  ].join("\n");
}

const ACTIVE_GROUNDING_POLICY = loadPredicateGroundingPolicy();

module.exports = { ACTIVE_GROUNDING_POLICY, groundingPolicyGuide, loadPredicateGroundingPolicy, sha256 };
