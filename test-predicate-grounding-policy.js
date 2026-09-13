"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { ACTIVE_GROUNDING_POLICY, loadPredicateGroundingPolicy } = require("./predicate-grounding-policy");

assert.equal(ACTIVE_GROUNDING_POLICY.ontology_identity.sha256, "40558d46e4e73028cc19e5f97cdaf316833f74b916f76552f6443e8d5312e3a0");
assert.match(ACTIVE_GROUNDING_POLICY.identity.sha256, /^[a-f0-9]{64}$/);
assert.equal(new Set(ACTIVE_GROUNDING_POLICY.overrides.map(item => item.predicate)).size, ACTIVE_GROUNDING_POLICY.overrides.length);
assert.match(ACTIVE_GROUNDING_POLICY.overrides.find(item => item.predicate === "role").license, /habitual/);
const copy = JSON.parse(fs.readFileSync(path.join(__dirname, "ontology/predicate-grounding-policy-v1.json"), "utf8"));
copy.ontology_identity.sha256 = "0".repeat(64);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pam-grounding-policy-"));
const file = path.join(dir, "bad.json");
fs.writeFileSync(file, JSON.stringify(copy));
assert.throws(() => loadPredicateGroundingPolicy(file), /ontology identity mismatch/);
console.log("predicate grounding policy ok: content-addressed, ontology-bound, and role semantics explicit");
