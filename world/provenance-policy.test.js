"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { WorldAgent } = require("./agent");
const { check } = require("./checker");
const { evaluateActionProvenance, normalizeActionPolicy } = require("./provenance-policy");

const IDEAS = { version: "provenance-policy-test-v1", predicates: [{ name: "ready", arity: 1 }, { name: "p", arity: 1 }, { name: "q", arity: 1 }] };
function temp(t) { const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pam-provenance-policy-")); t.after(() => fs.rmSync(dir, { recursive: true, force: true })); return dir; }
async function admit(agent, program, sourceGroup, lineageId = sourceGroup) {
  const source = agent.observe(program, { sourceGroup, sourceGroupAttestation: { by: "test_host", reason: "independent synthetic source fixture", lineage_id: lineageId } });
  const proposal = agent.propose(source, [{ program }]);
  await agent.admit(proposal, { admit: true, by: "test_operator", reason: "explicit fixture input" });
}
async function goal(agent, actionPolicy) {
  await agent.startGoal({ id: "release", text: "Release when ready.", query: "ready(orion)", action: "release_orion", ...(actionPolicy ? { actionPolicy } : {}) });
}

test("provenance action policy is explicit and bounded", () => {
  assert.equal(normalizeActionPolicy(null), null);
  assert.deepEqual(normalizeActionPolicy({ minIndependentFactSupportPaths: 2 }), { id: "independent-fact-support-v1", minIndependentFactSupportPaths: 2 });
  assert.deepEqual(normalizeActionPolicy({ minIndependentFactSupportPaths: 2, requireHostAttestedSourceGroups: true }), { id: "independent-host-attested-fact-support-v2", minIndependentFactSupportPaths: 2, requireHostAttestedSourceGroups: true });
  assert.deepEqual(normalizeActionPolicy({ minIndependentFactSupportPaths: 2, requireDistinctSourceLineages: true }), { id: "independent-host-attested-lineage-support-v3", minIndependentFactSupportPaths: 2, requireHostAttestedSourceGroups: true, requireDistinctSourceLineages: true });
  assert.throws(() => normalizeActionPolicy({ minIndependentFactSupportPaths: 0 }), /threshold/);
  assert.throws(() => normalizeActionPolicy({ minIndependentFactSupportPaths: 2, trustModel: true }), /unsupported/);
});

test("an item cannot split from or upgrade its recorded source group", async t => {
  const agent = new WorldAgent(temp(t), { agent_id: "source-binding", ideas: IDEAS, startTime: 0 });
  assert.throws(() => agent.observe("bad receipt", { sourceGroupAttestation: { by: "host", reason: "missing group" } }), /requires a declared source group/);
  assert.throws(() => agent.observe("bad receipt", { sourceGroup: "report_bad", sourceGroupAttestation: { by: "host", reason: "bad hash", external_receipt_sha256: "no" } }), /invalid external source receipt hash/);
  const source = agent.observe("one report", { sourceGroup: "report_a", sourceGroupAttestation: { by: "test_host", reason: "explicit synthetic source fixture" } });
  assert.throws(() => agent.propose(source, [{ program: "ready(orion).", source_group: "report_b" }]), /must match its recorded source event/);
  assert.throws(() => agent.propose(source, [{ program: "ready(orion).", source_group_assurance: "event_local" }]), /assurance must match/);
  const proposal = agent.propose(source, [{ program: "ready(orion).", source_group: "report_a" }]);
  await agent.admit(proposal, { admit: true, by: "test_operator", reason: "explicit fixture input" });
  assert.equal(agent.snapshot().items[0].source_group_assurance, "host_attested");
  assert.equal(agent.snapshot().items[0].source_group_attestation.schema_version, "source-group-attestation-v1");
});

test("a declared group without an attestation receipt is not host-attested", async t => {
  const agent = new WorldAgent(temp(t), { agent_id: "declared-only", ideas: IDEAS, startTime: 0 });
  const source = agent.observe("one report", { sourceGroup: "report_a" });
  const proposal = agent.propose(source, [{ program: "ready(orion)." }]);
  await agent.admit(proposal, { admit: true, by: "test_operator", reason: "explicit fixture input" });
  assert.equal(agent.snapshot().items[0].source_group_assurance, "host_declared");
});

test("checker rejects forged or malformed host attestation metadata", () => {
  const base = { id: "i1", source: "e1", source_group: "g1", source_group_assurance: "host_attested", program: "ready(orion)." };
  assert.throws(() => check({ snapshot: { ideas: IDEAS, items: [base] }, query: "ready(orion)" }), /requires an attestation receipt/);
  assert.throws(() => check({ snapshot: { ideas: IDEAS, items: [{ ...base, source_group_attestation: { schema_version: "source-group-attestation-v2", by: "host", reason: "claimed", lineage_id: "" } }] }, query: "ready(orion)" }), /source lineage is invalid/);
});

test("default behavior still acts on one safe support path", async t => {
  const agent = new WorldAgent(temp(t), { agent_id: "default", ideas: IDEAS, startTime: 0 });
  await admit(agent, "ready(orion).", "operator_a"); await goal(agent);
  const decision = await agent.step();
  assert.equal(decision.kind, "act");
  assert.equal(Object.hasOwn(decision, "provenance_policy"), false);
});

test("configured host policy pauses on one source group and survives reload", async t => {
  const directory = temp(t);
  const agent = new WorldAgent(directory, { agent_id: "threshold", ideas: IDEAS, startTime: 0 });
  await admit(agent, "ready(orion).", "operator_a"); await goal(agent, { minIndependentFactSupportPaths: 2 });
  const restored = new WorldAgent(directory);
  assert.equal(restored.state().goal.actionPolicy.minIndependentFactSupportPaths, 2);
  const decision = await restored.step();
  assert.equal(decision.kind, "pause");
  assert.equal(decision.reason, "insufficient_independent_fact_support");
  assert.equal(decision.provenance_policy.satisfied, false);
  assert.equal(decision.provenance_policy.eligible_support_path_count, 1);
});

test("two disjoint fact source groups license action and canonicalize the selected pair", async t => {
  const agent = new WorldAgent(temp(t), { agent_id: "three-paths", ideas: IDEAS, startTime: 0 });
  await admit(agent, "ready(orion).", "source_c");
  await admit(agent, "ready(orion).", "source_a");
  await admit(agent, "ready(orion).", "source_b");
  await goal(agent, { minIndependentFactSupportPaths: 2 });
  const decision = await agent.step();
  assert.equal(decision.kind, "act");
  assert.deepEqual(decision.provenance_policy.selected_support_paths.map(value => value.fact_source_group_ids), [["source_a"], ["source_b"]]);
});

test("strict policy rejects event-local groups and accepts two host-attested groups", async t => {
  const local = new WorldAgent(path.join(temp(t), "local"), { agent_id: "local", ideas: IDEAS, startTime: 0 });
  for (const text of ["first model proposal", "second model proposal"]) {
    const source = local.observe(text);
    const proposal = local.propose(source, [{ program: "ready(orion)." }]);
    await local.admit(proposal, { admit: true, by: "test_operator", reason: "explicit fixture input" });
  }
  await goal(local, { minIndependentFactSupportPaths: 2, requireHostAttestedSourceGroups: true });
  const blocked = await local.step();
  assert.equal(blocked.reason, "insufficient_independent_fact_support");
  assert.equal(blocked.provenance_policy.observed_support_path_count, 2);
  assert.equal(blocked.provenance_policy.eligible_support_path_count, 0);
  assert.equal(blocked.provenance_policy.rejected_unattested_support_path_count, 2);

  const attested = new WorldAgent(path.join(temp(t), "attested"), { agent_id: "attested", ideas: IDEAS, startTime: 0 });
  await admit(attested, "ready(orion).", "operator_a"); await admit(attested, "ready(orion).", "operator_b");
  await goal(attested, { minIndependentFactSupportPaths: 2, requireHostAttestedSourceGroups: true });
  const allowed = await attested.step();
  assert.equal(allowed.kind, "act");
  assert.equal(allowed.provenance_policy.policy.id, "independent-host-attested-fact-support-v2");
});

test("strict policy rejects mixed and legacy-unclassified provenance", async t => {
  const mixed = new WorldAgent(path.join(temp(t), "mixed"), { agent_id: "mixed", ideas: IDEAS, startTime: 0 });
  await admit(mixed, "ready(orion).", "operator_a");
  const localSource = mixed.observe("model-created second claim");
  const localProposal = mixed.propose(localSource, [{ program: "ready(orion)." }]);
  await mixed.admit(localProposal, { admit: true, by: "test_operator", reason: "explicit fixture input" });
  await goal(mixed, { minIndependentFactSupportPaths: 2, requireHostAttestedSourceGroups: true });
  const decision = await mixed.step();
  assert.equal(decision.kind, "pause");
  assert.equal(decision.provenance_policy.observed_support_path_count, 2);
  assert.equal(decision.provenance_policy.eligible_support_path_count, 1);

  const legacyResult = {
    status: "ok", query: "ready(orion)", raw_status: "entailed", safe_status: "entailed",
    safe_support_sets: ["legacy_a", "legacy_b"].map((group, index) => ({ literal: "ready(orion)", item_ids: [`i${index}`], fact_source_group_ids: [group], rule_source_group_ids: [] })),
  };
  const legacy = evaluateActionProvenance(legacyResult, legacyResult.query, { minIndependentFactSupportPaths: 2, requireHostAttestedSourceGroups: true });
  assert.equal(legacy.satisfied, false);
  assert.equal(legacy.rejected_unattested_support_path_count, 2);
});

test("lineage policy rejects copied origins and accepts distinct origins", async t => {
  const copied = new WorldAgent(path.join(temp(t), "copied"), { agent_id: "copied", ideas: IDEAS, startTime: 0 });
  await admit(copied, "ready(orion).", "publisher_a", "original_wire_report");
  await admit(copied, "ready(orion).", "publisher_b", "original_wire_report");
  await goal(copied, { minIndependentFactSupportPaths: 2, requireDistinctSourceLineages: true });
  const blocked = await copied.step();
  assert.equal(blocked.kind, "pause");
  assert.equal(blocked.provenance_policy.eligible_support_path_count, 2);
  assert.equal(blocked.provenance_policy.selected_support_paths.length, 0);

  const independent = new WorldAgent(path.join(temp(t), "independent"), { agent_id: "independent", ideas: IDEAS, startTime: 0 });
  await admit(independent, "ready(orion).", "publisher_a", "origin_a");
  await admit(independent, "ready(orion).", "publisher_b", "origin_b");
  await goal(independent, { minIndependentFactSupportPaths: 2, requireDistinctSourceLineages: true });
  const allowed = await independent.step();
  assert.equal(allowed.kind, "act");
  assert.equal(allowed.provenance_policy.policy.id, "independent-host-attested-lineage-support-v3");
  assert.deepEqual(allowed.provenance_policy.selected_support_paths.map(path => path.fact_source_lineage_ids), [["origin_a"], ["origin_b"]]);
});

test("explicit assertion dependency invalidates a stale copy after replacement and reload", async t => {
  const directory = temp(t);
  const agent = new WorldAgent(directory, { agent_id: "dependent-copy", ideas: IDEAS, startTime: 0 });
  const sourceFor = (text, group, lineage, at = agent.state().now) => agent.observe(text, { at, sourceGroup: group, sourceGroupAttestation: { by: "test_host", reason: "explicit synthetic dependency fixture", lineage_id: lineage } });

  const originSource = sourceFor("origin", "publisher_a", "origin_a");
  const originProposal = agent.propose(originSource, [{ id: "origin_assertion", program: "ready(orion)." }]);
  await agent.admit(originProposal, { admit: true, by: "test_operator", reason: "dependency fixture origin" });
  const copySource = sourceFor("copied assertion", "mirror_a", "origin_a");
  const copyProposal = agent.propose(copySource, [{ id: "dependent_copy", program: "ready(orion).", dependsOn: ["origin_assertion"] }]);
  await agent.admit(copyProposal, { admit: true, by: "test_operator", reason: "dependency fixture copy" });
  const independentSource = sourceFor("independent assertion", "publisher_b", "origin_b");
  const independentProposal = agent.propose(independentSource, [{ id: "independent_assertion", program: "ready(orion)." }]);
  await agent.admit(independentProposal, { admit: true, by: "test_operator", reason: "dependency fixture independent source" });

  assert.deepEqual(agent.snapshot().items.map(item => item.id), ["origin_assertion", "dependent_copy", "independent_assertion"]);
  const correctionSource = sourceFor("origin withdrawn", "publisher_a", "origin_a", 1);
  const correctionProposal = agent.propose(correctionSource, [{ id: "origin_withdrawal", program: "p(orion).", replaces: "origin_assertion" }]);
  await agent.admit(correctionProposal, { admit: true, by: "test_operator", reason: "dependency fixture withdrawal" });

  const restored = new WorldAgent(directory);
  assert.deepEqual(restored.snapshot().items.map(item => item.id), ["independent_assertion", "origin_withdrawal"]);
  await goal(restored, { minIndependentFactSupportPaths: 2, requireDistinctSourceLineages: true });
  const decision = await restored.step();
  assert.equal(decision.kind, "pause");
  assert.equal(decision.reason, "insufficient_independent_fact_support");
  assert.equal(decision.provenance_policy.eligible_support_path_count, 1);
});

test("lineage alone does not invent an assertion dependency", async t => {
  const agent = new WorldAgent(temp(t), { agent_id: "lineage-not-dependency", ideas: IDEAS, startTime: 0 });
  const first = agent.observe("origin", { sourceGroup: "publisher", sourceGroupAttestation: { by: "test_host", reason: "fixture", lineage_id: "shared" } });
  const firstProposal = agent.propose(first, [{ id: "origin_item", program: "ready(orion)." }]);
  await agent.admit(firstProposal, { admit: true, by: "test_operator", reason: "fixture" });
  const second = agent.observe("same lineage but no declared dependency", { sourceGroup: "mirror", sourceGroupAttestation: { by: "test_host", reason: "fixture", lineage_id: "shared" } });
  const secondProposal = agent.propose(second, [{ id: "unbound_item", program: "ready(orion)." }]);
  await agent.admit(secondProposal, { admit: true, by: "test_operator", reason: "fixture" });
  const correction = agent.observe("replace origin", { at: 1, sourceGroup: "publisher", sourceGroupAttestation: { by: "test_host", reason: "fixture", lineage_id: "shared" } });
  const correctionProposal = agent.propose(correction, [{ id: "replacement_item", program: "p(orion).", replaces: "origin_item" }]);
  await agent.admit(correctionProposal, { admit: true, by: "test_operator", reason: "fixture" });
  assert.equal(agent.snapshot().items.some(item => item.id === "unbound_item"), true);
  assert.throws(() => agent.propose(correction, [{ program: "ready(orion).", dependsOn: ["missing_item"] }]), /dependencies/);
});

test("lineage policy rejects attested receipts that do not classify lineage", async t => {
  const agent = new WorldAgent(temp(t), { agent_id: "missing-lineage", ideas: IDEAS, startTime: 0 });
  for (const group of ["publisher_a", "publisher_b"]) {
    const source = agent.observe(group, { sourceGroup: group, sourceGroupAttestation: { by: "test_host", reason: "identity known but upstream lineage unavailable" } });
    const proposal = agent.propose(source, [{ program: "ready(orion)." }]);
    await agent.admit(proposal, { admit: true, by: "test_operator", reason: "explicit fixture input" });
  }
  await goal(agent, { minIndependentFactSupportPaths: 2, requireDistinctSourceLineages: true });
  const decision = await agent.step();
  assert.equal(decision.kind, "pause");
  assert.equal(decision.provenance_policy.rejected_unlineaged_support_path_count, 2);
});

test("different items or rule groups do not manufacture fact-source independence", async t => {
  const direct = new WorldAgent(path.join(temp(t), "direct"), { agent_id: "same-origin", ideas: IDEAS, startTime: 0 });
  await admit(direct, "ready(orion).", "same_report");
  await admit(direct, "ready(orion).", "same_report");
  await goal(direct, { minIndependentFactSupportPaths: 2 });
  assert.equal((await direct.step()).reason, "insufficient_independent_fact_support");

  const derived = new WorldAgent(path.join(temp(t), "derived"), { agent_id: "rule-groups", ideas: IDEAS, startTime: 0 });
  await admit(derived, "p(orion).", "same_report"); await admit(derived, "q(orion).", "same_report");
  await admit(derived, "ready(X) :- p(X).", "rules_a"); await admit(derived, "ready(X) :- q(X).", "rules_b");
  await goal(derived, { minIndependentFactSupportPaths: 2 });
  const decision = await derived.step();
  assert.equal(decision.reason, "insufficient_independent_fact_support");
  assert.equal(decision.provenance_policy.eligible_support_path_count, 2);
});

test("support selector reproduces the frozen stress oracle under its benchmark decision mapping", () => {
  const fixture = require("../.cdr/waves/provenance-decision-stress-v2/fixture.json");
  for (const item of fixture.cases) {
    const receipt = item.checker_receipt;
    const result = {
      status: "ok", query: receipt.query, raw_status: receipt.raw_status, safe_status: receipt.safe_status,
      safe_support_sets: receipt.positive_support_sets.map(value => ({ ...value, literal: receipt.query })),
    };
    const evaluation = evaluateActionProvenance(result, receipt.query, { minIndependentFactSupportPaths: 2 });
    // This benchmark maps an unmet threshold to ask. WorldAgent maps the same
    // state to pause/insufficient_independent_fact_support; this is deliberately
    // a support-selection replay rather than an end-to-end agent equivalence test.
    const decision = receipt.raw_status === "conflict" || receipt.raw_status === "contradicted" ? "pause" : evaluation.satisfied ? "act" : "ask";
    const support = evaluation.satisfied ? evaluation.selected_support_paths.map(value => value.fact_source_group_ids.join(",")).join("|") : "none";
    assert.deepEqual({ decision, support }, { decision: item.oracle.decision, support: item.oracle.support }, item.case_id);
  }
});
