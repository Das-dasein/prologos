"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { WorldAgent } = require("../agent");
const { prepareBundle, sha256 } = require("../osv-advisory");
const { buildEpisode, classifyRedelivery, IDEAS, literalFromProgram } = require("./episode.cjs");
const independent = require("./independent-tms.cjs");
const { runFixture, runWorldCase } = require("./runner.cjs");

function raw({ modified, fixed = "2.0.0", withdrawn } = {}) {
  return Buffer.from(JSON.stringify({ schema_version: "1.7.3", id: "GHSA-episode-test", modified, ...(withdrawn ? { withdrawn } : {}), affected: [{ package: { ecosystem: "npm", name: "example" }, ranges: [{ type: "SEMVER", events: [{ introduced: "0" }, { fixed }] }] }] }));
}

async function admit(agent, descriptor, item, at) {
  const source = agent.observe(`${descriptor.id} ${descriptor.modified}`, { at, sourceGroup: descriptor.source_group, sourceGroupAttestation: descriptor.source_group_attestation });
  const proposal = agent.propose(source, [item], { at });
  await agent.admit(proposal, { admit: true, by: "episode_test", reason: "deterministic fixture" });
}

test("dependency removes an imported old assessment after replacement and restart", async t => {
  const oldRaw = raw({ modified: "2026-01-01T00:00:00Z", fixed: "2.0.0" }), newRaw = raw({ modified: "2026-01-02T00:00:00Z", fixed: "3.0.0" });
  const episode = buildEpisode(oldRaw, newRaw, { ecosystem: "npm", name: "example", version: "2.0.0" });
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pam-osv-episode-")); t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const agent = new WorldAgent(directory, { agent_id: "episode", ideas: IDEAS, startTime: 0 });
  await admit(agent, episode.oldDescriptor, episode.oldItem, 0);
  const copySource = agent.observe("explicit imported copy", { at: 0, sourceGroup: `copy:${episode.oldDescriptor.source_group}`, sourceGroupAttestation: { ...episode.oldDescriptor.source_group_attestation, reason: "explicit imported copy" } });
  await agent.admit(agent.propose(copySource, [episode.copyItem]), { admit: true, by: "episode_test", reason: "explicit copy dependency" });
  await admit(agent, episode.newDescriptor, episode.newItem, 1);
  const restored = new WorldAgent(directory);
  assert.deepEqual(restored.snapshot().items.map(item => item.id), [episode.newItem.id]);
  assert.equal(classifyRedelivery(restored.state(), prepareBundle([oldRaw], episode.target)[0]).disposition, "stale_or_duplicate");
});

test("no-dependency ablation retains the old copy and independent TMS sees conflict", () => {
  const episode = buildEpisode(raw({ modified: "2026-01-01T00:00:00Z", fixed: "2.0.0" }), raw({ modified: "2026-01-02T00:00:00Z", fixed: "3.0.0" }), { ecosystem: "npm", name: "example", version: "2.0.0" }, { dependencies: false });
  const items = [episode.oldItem, episode.copyItem, episode.newItem].map(item => ({ id: item.id, literal: literalFromProgram(item.program), replaces: item.replaces, dependsOn: item.dependsOn }));
  const result = independent.decide(items, episode.query, episode.kind);
  assert.equal(result.action, "flag_conflict");
  assert.ok(result.result.active_item_ids.includes(episode.copyItem.id));
});

test("withdrawal turns dependency-aware unknown into a source request", () => {
  const episode = buildEpisode(raw({ modified: "2026-01-01T00:00:00Z" }), raw({ modified: "2026-01-02T00:00:00Z", withdrawn: "2026-01-02T00:00:00Z" }), { ecosystem: "npm", name: "example", version: "1.0.0" });
  const items = [episode.oldItem, episode.copyItem, episode.newItem].map(item => ({ id: item.id, literal: literalFromProgram(item.program), replaces: item.replaces, dependsOn: item.dependsOn }));
  assert.equal(independent.decide(items, episode.query, episode.kind).action, "request_source");
  const withoutDependency = items.map(item => item.id === episode.copyItem.id ? { ...item, dependsOn: undefined } : item);
  assert.equal(independent.decide(withoutDependency, episode.query, episode.kind).action, "report_current_assessment");
});

test("real WorldAgent distinguishes dependency and no-dependency outcomes", async () => {
  const oldRaw = raw({ modified: "2026-01-01T00:00:00Z", fixed: "2.0.0" }), changedRaw = raw({ modified: "2026-01-02T00:00:00Z", fixed: "3.0.0" });
  assert.equal((await runWorldCase(oldRaw, changedRaw, { ecosystem: "npm", name: "example", version: "2.0.0" }, { dependencies: true })).output, "report_current_assessment");
  assert.equal((await runWorldCase(oldRaw, changedRaw, { ecosystem: "npm", name: "example", version: "2.0.0" }, { dependencies: false })).output, "flag_conflict");
  const withdrawnRaw = raw({ modified: "2026-01-02T00:00:00Z", withdrawn: "2026-01-02T00:00:00Z" });
  assert.equal((await runWorldCase(oldRaw, withdrawnRaw, { ecosystem: "npm", name: "example", version: "1.0.0" }, { dependencies: true })).output, "request_source");
  const stale = await runWorldCase(oldRaw, withdrawnRaw, { ecosystem: "npm", name: "example", version: "1.0.0" }, { dependencies: false });
  assert.equal(stale.output, "report_current_assessment");
  assert.equal(stale.stale_basis_decision, true);
});

test("four-system fixture exposes the prespecified dependency ablation", async t => {
  const oldRaw = raw({ modified: "2026-01-01T00:00:00Z", fixed: "2.0.0" }), newRaw = raw({ modified: "2026-01-02T00:00:00Z", fixed: "3.0.0" });
  const receipts = fs.mkdtempSync(path.join(os.tmpdir(), "pam-osv-runner-receipts-")); t.after(() => fs.rmSync(receipts, { recursive: true, force: true }));
  fs.writeFileSync(path.join(receipts, `${sha256(oldRaw)}.json`), oldRaw); fs.writeFileSync(path.join(receipts, `${sha256(newRaw)}.json`), newRaw);
  const fixture = {
    schema_version: "osv-revision-dependency-fixture-v1",
    cases: [{ case_id: "osv-revision-001", entry_id: "GHSA-episode-test", target: { ecosystem: "npm", name: "example", version: "2.0.0" }, transition: { kind: "classification_flip", before: "record_does_not_claim_affected", after: "record_claims_affected" }, old_revision: { receipt_sha256: sha256(oldRaw) }, new_revision: { receipt_sha256: sha256(newRaw) } }],
  };
  const report = await runFixture(fixture, receipts);
  assert.equal(report.summary.systems.world_dependency.exact, 1);
  assert.equal(report.summary.systems.world_no_dependency.exact, 0);
  assert.equal(report.summary.systems.world_no_dependency.false_conflicts, 1);
  assert.equal(report.summary.systems.independent_tms.exact, 1);
});
