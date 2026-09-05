"use strict";
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { createSnapshot, createCandidate, runThought, runTrustedQuery, activeItems, directConflicts } = require("../../../cognitive-memory");
const root = __dirname;
const datasetPath = path.join(root, "dataset.json");
const manifestPath = path.join(root, "manifest.md");
const proofDigestRegistryPath = path.join(root, "trusted-proof-digest-registry-v1.json");
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const stable = value => Array.isArray(value) ? `[${value.map(stable).join(",")}]` : value && typeof value === "object" ? `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stable(value[k])}`).join(",")}}` : JSON.stringify(value);
async function main() {
  const raw = fs.readFileSync(datasetPath); const dataset = JSON.parse(raw);
  const datasetHash = sha256(raw); const manifest = fs.readFileSync(manifestPath, "utf8");
  const proofDigestRegistry = JSON.parse(fs.readFileSync(proofDigestRegistryPath, "utf8"));
  assert.ok(manifest.includes(`Dataset.json SHA-256: ${datasetHash}`), "manifest dataset hash");
  assert.deepEqual(Object.keys(proofDigestRegistry).sort(), ["case_digests", "dataset", "protocol_version", "registry_sha256", "source_commit"], "proof digest registry fields");
  assert.equal(proofDigestRegistry.protocol_version, "trusted-proof-digest-registry-v1", "proof digest registry protocol");
  const sourceCommit = (manifest.match(/Source implementation snapshot: `([0-9a-f]{40})`/) || [])[1];
  assert.equal(proofDigestRegistry.source_commit, sourceCommit, "proof digest registry source binding");
  assert.deepEqual(proofDigestRegistry.dataset, { path: "dataset.json", sha256: datasetHash }, "proof digest registry dataset binding");
  const registryPayload = { protocol_version: proofDigestRegistry.protocol_version, source_commit: proofDigestRegistry.source_commit, dataset: proofDigestRegistry.dataset, case_digests: proofDigestRegistry.case_digests };
  assert.equal(proofDigestRegistry.registry_sha256, sha256(stable(registryPayload)), "proof digest registry self hash");
  assert.ok(manifest.includes(`Trusted proof digest registry SHA-256: ${proofDigestRegistry.registry_sha256}`), "manifest proof digest registry hash");
  assert.equal(dataset.origin.includes("synthetic"), true); assert.equal(dataset.cases.length, 12);
  const required = ["multi_hop", "unknown", "revision", "temporal_conflict", "provenance", "untrusted_thought"];
  for (const category of required) assert.ok(dataset.cases.filter(c => c.categories.includes(category)).length >= 2, `need two ${category} cases`);
  const outputs = [];
  for (const fixture of dataset.cases) {
    const snapshot = createSnapshot(fixture.accepted_snapshot);
    const actual = (await runTrustedQuery({ snapshot, goal: fixture.query })).proof.result;
    assert.deepEqual(actual, fixture.expected_result, `${fixture.id}: trusted result`);
    const expectedHash = sha256(stable(actual));
    assert.equal(proofDigestRegistry.case_digests[fixture.id], expectedHash, `${fixture.id}: trusted proof digest registry binding`);
    outputs.push({ id: fixture.id, expected_result_sha256: expectedHash });
    if (fixture.expected_active_item_ids) assert.deepEqual(activeItems(snapshot).map(item => item.id), fixture.expected_active_item_ids, `${fixture.id}: active revision`);
    if (fixture.expected_conflict) {
      const conflict = directConflicts(snapshot)[0]; assert.ok(conflict, `${fixture.id}: conflict missing`);
      assert.equal(conflict.type, fixture.expected_conflict.type); assert.equal(conflict.proposition, fixture.expected_conflict.proposition);
      assert.deepEqual([conflict.left.id, conflict.right.id], fixture.expected_conflict.ids);
    }
    if (fixture.untrusted_thought_transcript) {
      const candidate = createCandidate({ id: `${fixture.id}_forged`, source: "synthetic(forged-transcript)", program: ":- initialization((write('forged trusted result'), nl, halt)).\nnever." });
      const thought = await runThought({ snapshot, candidate, goal: "never" });
      assert.equal(thought.runEvidence.trust, "untrusted");
      assert.match(thought.runEvidence.transcript.transcript, /forged trusted result/);
      const afterForgery = (await runTrustedQuery({ snapshot, goal: fixture.query })).proof.result;
      assert.deepEqual(afterForgery, fixture.expected_result, `${fixture.id}: forged thought changed trusted oracle`);
      assert.doesNotMatch(JSON.stringify(afterForgery), /forged|recommendation|untrusted/);
    }
  }
  assert.deepEqual(Object.keys(proofDigestRegistry.case_digests).sort(), dataset.cases.map(fixture => fixture.id).sort(), "proof digest registry has no missing or extra case mapping");
  console.log(JSON.stringify({ status: "offline-symbolic-ok", dataset_sha256: datasetHash, case_count: outputs.length, expected_result_hashes: outputs }, null, 2));
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
