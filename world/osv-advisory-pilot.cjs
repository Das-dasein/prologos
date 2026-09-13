#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { WorldAgent } = require("./agent");
const { fetchRecord, prepareBundle, prologAtom, storeRawReceipts, toWorldItem } = require("./osv-advisory");

function option(argv, name) { const index = argv.indexOf(name); return index < 0 ? null : argv[index + 1]; }
function options(argv, name) { return argv.flatMap((value, index) => value === name && argv[index + 1] ? [argv[index + 1]] : []); }

async function runDecision(descriptors, target) {
  if (!descriptors.length || new Set(descriptors.map(value => value.vulnerability_id)).size !== 1) throw new Error("OSV pilot requires one alias-connected vulnerability family");
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pam-osv-pilot-"));
  try {
    const agent = new WorldAgent(directory, { agent_id: "osv-advisory-pilot-v1", ideas: { version: "osv-advisory-pilot-v1", predicates: [{ name: "record_claims_affected", arity: 3 }] }, startTime: 0 });
    for (const descriptor of descriptors) {
      const item = toWorldItem(descriptor);
      if (!item) continue;
      const source = agent.observe(`${descriptor.id} at ${descriptor.modified}: ${descriptor.assessment.status}`, { sourceGroup: descriptor.source_group, sourceGroupAttestation: descriptor.source_group_attestation });
      const proposal = agent.propose(source, [item]);
      await agent.admit(proposal, { admit: true, by: "connector/osv-advisory-pilot-v1", reason: "deterministic assessment from a retained OSV record; no package safety certification" });
    }
    const vulnerability = descriptors[0].vulnerability_id;
    const query = `record_claims_affected(${prologAtom(vulnerability)},${prologAtom(`${target.ecosystem}:${target.name}`)},${prologAtom(target.version)})`;
    await agent.startGoal({ id: "current_assessment", text: `Report the current published assessment for ${target.ecosystem}:${target.name}@${target.version}.`, query, action: "report_current_assessment" });
    const decision = await agent.step();
    const published = new Set(descriptors.map(value => value.assessment.status));
    const expected = published.has("record_claims_affected") && published.has("record_does_not_claim_affected") ? { decision: "pause", reason: "goal_conflicted", local_outcome: "flag_conflict" } : null;
    if (!expected) throw new Error("OSV pilot inputs do not contain the prespecified record-level assessment disagreement");
    return {
      query,
      expected,
      actual: { decision: decision.kind, reason: decision.reason, local_outcome: decision.kind === "pause" && decision.reason === "goal_conflicted" ? "flag_conflict" : "other" },
      exact: decision.kind === expected.decision && decision.reason === expected.reason,
      snapshot_sha256: decision.snapshot,
    };
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
}

async function buildReport(rawRecords, target, metadata = {}) {
  const descriptors = prepareBundle(rawRecords, target);
  return {
    schema_version: "osv-advisory-conflict-pilot-v1",
    experiment_kind: "external_metadata_engineering_pilot",
    claim_boundary: "Current retained OSV records are deterministically evaluated for one npm SemVer target and passed through the real journal, checker and decision path. This pilot does not establish package safety, source truth, policy utility, historical revision handling or general accuracy.",
    ...metadata,
    target,
    records: descriptors,
    decision: await runDecision(descriptors, target),
  };
}

async function main(argv = process.argv.slice(2)) {
  const ids = options(argv, "--id"), ecosystem = option(argv, "--ecosystem"), name = option(argv, "--package"), version = option(argv, "--version");
  const receiptDir = option(argv, "--receipt-dir"), out = option(argv, "--out");
  if (ids.length < 2 || ids.length > 8 || !ecosystem || !name || !version || !receiptDir || !out) throw new Error("usage: node world/osv-advisory-pilot.cjs --id ID --id ID --ecosystem npm --package NAME --version VERSION --receipt-dir DIR --out REPORT.json");
  const output = path.resolve(out);
  if (fs.existsSync(output)) throw new Error("refusing to overwrite OSV pilot report");
  const rawRecords = await Promise.all(ids.map(id => fetchRecord(id)));
  const receiptFiles = storeRawReceipts(rawRecords, receiptDir);
  const report = await buildReport(rawRecords, { ecosystem, name, version }, {
    retrieved_at: new Date().toISOString(),
    api_base: "https://api.osv.dev/v1/vulns/",
    requested_ids: ids,
    receipt_files: receiptFiles.map(file => path.relative(path.dirname(output), path.resolve(file))),
  });
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, { flag: "wx" });
  process.stdout.write(`${JSON.stringify({ status: report.schema_version, exact: report.decision.exact, out: output })}\n`);
}

if (require.main === module) main().catch(error => { process.stderr.write(`${error.stack || error.message}\n`); process.exitCode = 1; });
module.exports = { buildReport, runDecision };
