#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { performance } = require("node:perf_hooks");
const { WorldAgent } = require("../agent");
const { sha256 } = require("../osv-advisory");
const { buildEpisode, classifyRedelivery, IDEAS, literalFromProgram } = require("./episode.cjs");
const independent = require("./independent-tms.cjs");

function outputForDecision(decision) {
  if (decision.kind === "act") return decision.action;
  if (decision.kind === "ask" && decision.question?.id === "request_current_source") return "request_source";
  if (decision.kind === "pause" && decision.reason === "goal_conflicted") return "flag_conflict";
  return `invalid:${decision.kind}:${decision.reason ?? "none"}`;
}

async function admit(agent, descriptor, item, at, authority, reason) {
  const source = agent.observe(`${descriptor.id} at ${descriptor.modified}: ${descriptor.assessment.status}`, { at, sourceGroup: descriptor.source_group, sourceGroupAttestation: descriptor.source_group_attestation });
  const proposal = agent.propose(source, [item], { at });
  await agent.admit(proposal, { admit: true, by: authority, reason });
}

async function runWorldCase(oldRaw, newRaw, target, { dependencies }) {
  const started = performance.now(), directory = fs.mkdtempSync(path.join(os.tmpdir(), `pam-osv-revision-${dependencies ? "dep" : "ablation"}-`));
  try {
    const episode = buildEpisode(oldRaw, newRaw, target, { dependencies });
    const agent = new WorldAgent(directory, { agent_id: dependencies ? "osv-dependency" : "osv-no-dependency", ideas: IDEAS, startTime: 0 });
    await admit(agent, episode.oldDescriptor, episode.oldItem, 0, "osv_revision_runner_v1", "retained old OSV revision");
    const copyDescriptor = { ...episode.oldDescriptor, source_group: `osv:copy:${episode.oldDescriptor.id}@${episode.oldDescriptor.modified}`, source_group_attestation: { ...episode.oldDescriptor.source_group_attestation, reason: "explicit imported copy of the named source assertion" } };
    await admit(agent, copyDescriptor, episode.copyItem, 0, "osv_revision_runner_v1", dependencies ? "explicit copy with assertion dependency" : "no-dependency ablation copy");
    await admit(agent, episode.newDescriptor, episode.newItem, 1, "osv_revision_runner_v1", "retained replacement or withdrawal revision");
    const beforeRestart = agent.snapshot(), restored = new WorldAgent(directory), afterRestart = restored.snapshot();
    const redelivery = classifyRedelivery(restored.state(), episode.oldDescriptor);
    assert.equal(redelivery.disposition, "stale_or_duplicate");
    restored.observe(`stale redelivery rejected: ${episode.oldDescriptor.id} at ${episode.oldDescriptor.modified}`, { at: 2, sourceGroup: episode.oldDescriptor.source_group, sourceGroupAttestation: episode.oldDescriptor.source_group_attestation });
    const questions = episode.kind === "withdrawal" ? [{ id: "request_current_source", text: "Request a current advisory source.", literal: episode.query, cost: 1 }] : [];
    await restored.startGoal({ id: "current_assessment", text: "Choose the bounded current advisory action.", query: episode.query, action: "report_current_assessment", questions });
    const decision = await restored.step(), snapshot = restored.snapshot();
    const output = outputForDecision(decision), copyActive = snapshot.items.some(item => item.id === episode.copyItem.id);
    return {
      output,
      decision: { kind: decision.kind, reason: decision.reason ?? null, action: decision.action ?? null, question_id: decision.question?.id ?? null, snapshot_sha256: decision.snapshot },
      redelivery,
      restart_stable: beforeRestart.sha256 === afterRestart.sha256,
      active_item_ids: snapshot.items.map(item => item.id),
      stale_basis_decision: output === "report_current_assessment" && copyActive,
      retained_inactive_dependency_copy: dependencies ? copyActive : null,
      proof_references_old_or_copy: decision.kind === "act" && JSON.stringify(decision.proof ?? []).includes(episode.copyItem.id),
      runtime_ms: Number((performance.now() - started).toFixed(3)),
      state_bytes: Buffer.byteLength(JSON.stringify(restored.state())),
    };
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
}

function independentItems(episode) {
  return [episode.oldItem, episode.copyItem, episode.newItem].map(item => ({ id: item.id, literal: literalFromProgram(item.program), replaces: item.replaces, dependsOn: item.dependsOn }));
}

async function runCase(caseSpec, oldRaw, newRaw) {
  assert.equal(sha256(oldRaw), caseSpec.old_revision.receipt_sha256);
  assert.equal(sha256(newRaw), caseSpec.new_revision.receipt_sha256);
  const episode = buildEpisode(oldRaw, newRaw, caseSpec.target);
  assert.equal(episode.oldDescriptor.id, caseSpec.entry_id);
  assert.deepEqual({ kind: episode.kind, before: episode.oldDescriptor.assessment.status, after: episode.newDescriptor.assessment.status }, caseSpec.transition);
  const oracle = episode.kind === "withdrawal" ? "request_source" : "report_current_assessment";
  const aggregator = { output: oracle, source: "newest exact entry revision only" };
  const world = await runWorldCase(oldRaw, newRaw, caseSpec.target, { dependencies: true });
  const noDependency = await runWorldCase(oldRaw, newRaw, caseSpec.target, { dependencies: false });
  const tmsStarted = performance.now(), tmsDecision = independent.decide(independentItems(episode), episode.query, episode.kind);
  const independentTms = { output: tmsDecision.action, status: tmsDecision.result.status, active_item_ids: tmsDecision.result.active_item_ids, runtime_ms: Number((performance.now() - tmsStarted).toFixed(3)) };
  const systems = { javascript_aggregator: aggregator, world_dependency: world, world_no_dependency: noDependency, independent_tms: independentTms };
  for (const result of Object.values(systems)) result.exact = result.output === oracle;
  return { case_id: caseSpec.case_id, entry_id: caseSpec.entry_id, target: caseSpec.target, transition: caseSpec.transition, oracle, systems };
}

function summarize(records) {
  const names = Object.keys(records[0]?.systems ?? {}), systems = {};
  for (const name of names) {
    const values = records.map(record => record.systems[name]);
    systems[name] = {
      cases: values.length,
      exact: values.filter(value => value.exact).length,
      stale_basis_decisions: values.filter(value => value.stale_basis_decision === true).length,
      false_conflicts: records.filter(record => record.systems[name].output === "flag_conflict" && record.oracle !== "flag_conflict").length,
      extra_source_requests: records.filter(record => record.systems[name].output === "request_source" && record.oracle !== "request_source").length,
      restart_stable: values.filter(value => value.restart_stable === true).length || null,
    };
  }
  return { cases: records.length, systems };
}

async function runFixture(fixture, receiptDirectory) {
  assert.equal(fixture.schema_version, "osv-revision-dependency-fixture-v1");
  const records = [];
  for (const caseSpec of fixture.cases) {
    const oldRaw = fs.readFileSync(path.join(receiptDirectory, `${caseSpec.old_revision.receipt_sha256}.json`));
    const newRaw = fs.readFileSync(path.join(receiptDirectory, `${caseSpec.new_revision.receipt_sha256}.json`));
    records.push(await runCase(caseSpec, oldRaw, newRaw));
  }
  return { schema_version: "osv-revision-dependency-report-v1", claim_boundary: "Deterministic revision stress-set comparison; not vulnerability truth, OSV prevalence, clinical evidence or general agent-memory utility.", fixture_sha256: sha256(Buffer.from(JSON.stringify(fixture))), records, summary: summarize(records) };
}

function option(argv, name) { const index = argv.indexOf(name); return index < 0 ? null : argv[index + 1]; }

async function main(argv = process.argv.slice(2)) {
  const fixturePath = option(argv, "--fixture"), receipts = option(argv, "--receipt-dir"), out = option(argv, "--out");
  if (!fixturePath || !receipts || !out) throw new Error("usage: node runner.cjs --fixture fixture.json --receipt-dir receipts --out report.json");
  const output = path.resolve(out);
  if (fs.existsSync(output)) throw new Error("refusing to overwrite experiment report");
  const fixture = JSON.parse(fs.readFileSync(path.resolve(fixturePath), "utf8")), report = await runFixture(fixture, path.resolve(receipts));
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, { flag: "wx" });
  process.stdout.write(`${JSON.stringify({ status: report.schema_version, ...report.summary, out: output })}\n`);
}

if (require.main === module) main().catch(error => { process.stderr.write(`${error.stack || error.message}\n`); process.exitCode = 1; });
module.exports = { outputForDecision, runCase, runFixture, runWorldCase, summarize };
