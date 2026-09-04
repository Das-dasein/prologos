"use strict";
const assert = require("node:assert");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { evaluateHypothesis } = require("./hypothesis-elenchus");
const { execFileSync } = require("node:child_process");

const memoryPath = path.join(__dirname, "test-fixtures", "elenchus-memory.pl");
const trustedRegistryPath = path.join(__dirname, "ontology-registry-v1.json");
const registry = { version: "predicate-registry-v1", declarations: [
  { name: "works_at", arity: 2, kind: "base" }, { name: "eligible", arity: 1, kind: "derived" }
] };
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
function hypothesis(id, support) { return {
  schema_version: "reflection-hypothesis-v1", hypothesis_id: id, decision: "proposed",
  registry_identity: { name: "test_registry", version: "predicate-registry-v1", sha256: sha256(JSON.stringify(registry)) },
  registry, supporting_assertion_ids: support,
  rule: { id: "r_eligible", head: { predicate: "eligible", arguments: ["P"] }, body: [{ predicate: "works_at", arguments: ["P", "acme"] }] }
}; }
(async () => {
  const before = fs.readFileSync(memoryPath, "utf8");
  const registryBefore = fs.readFileSync(trustedRegistryPath, "utf8");
  const accepted = await evaluateHypothesis(hypothesis("h_accept", ["a_work_carol"]), { memoryPath });
  assert.equal(accepted.decision, "accepted");
  assert.equal(accepted.candidate.status, "ok");
  assert.deepEqual(accepted.refuting_assertion_ids, []);
  const rejected = await evaluateHypothesis(hypothesis("h_counterexample", ["a_work"]), { memoryPath });
  assert.equal(rejected.decision, "rejected");
  assert.deepEqual(rejected.refuting_assertion_ids, ["a_not_eligible"]);
  assert.equal(rejected.candidate, null);
  const conflicted = await evaluateHypothesis(hypothesis("h_superseded", ["a_old_work"]), { memoryPath });
  assert.equal(conflicted.decision, "conflicted");
  assert.equal(conflicted.candidate, null);
  const reviewed = await evaluateHypothesis(hypothesis("h_reviewed", ["a_reviewed_work"]), { memoryPath });
  assert.equal(reviewed.decision, "conflicted");
  assert.equal(reviewed.candidate, null);
  const invalid = await evaluateHypothesis({ ...hypothesis("h_invalid", []), supporting_assertion_ids: [] }, { memoryPath });
  assert.equal(invalid.decision, "rejected");
  assert.equal(invalid.registry_identity.name, "test_registry");
  assert.match(invalid.source_snapshot_sha256, /^[a-f0-9]{64}$/);
  const repeatA = await evaluateHypothesis(hypothesis("h_repeat", ["a_work_carol"]), { memoryPath });
  const repeatB = await evaluateHypothesis(hypothesis("h_repeat", ["a_work_carol"]), { memoryPath });
  assert.deepEqual(repeatA, repeatB);
  assert.equal(fs.readFileSync(memoryPath, "utf8"), before);
  assert.equal(fs.readFileSync(trustedRegistryPath, "utf8"), registryBefore);
  const cli = JSON.parse(execFileSync(process.execPath, ["elenchus-cli.js", "--hypothesis", "test-fixtures/hypothesis-accept.json", "--memory", "test-fixtures/elenchus-memory.pl"], { cwd: __dirname, encoding: "utf8" }));
  assert.equal(cli.decision, "accepted");
  console.log("elenchus ok");
})().catch(error => { console.error(error); process.exitCode = 1; });
