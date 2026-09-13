#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { WorldAgent } = require("./agent");
const { verify } = require("./datacite-lineage-verify.cjs");

function sha256(value) { return crypto.createHash("sha256").update(value).digest("hex"); }
function option(argv, name) { const index = argv.indexOf(name); return index < 0 ? null : argv[index + 1]; }

async function decisionFor(records, actionPolicy, label) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), `pam-datacite-e2e-${label}-`));
  try {
    const ideas = { version: "datacite-lineage-carrier-v1", predicates: [{ name: "carrier", arity: 1 }] };
    const agent = new WorldAgent(directory, { agent_id: `datacite-${label}`, ideas, startTime: 0 });
    for (const record of records) {
      const source = agent.observe(record.title || record.doi, { sourceGroup: record.source_group, sourceGroupAttestation: record.source_group_attestation });
      const proposal = agent.propose(source, [{ program: "carrier(orion)." }]);
      await agent.admit(proposal, { admit: true, by: "datacite_e2e_fixture", reason: "neutral carrier fact for provenance plumbing only" });
    }
    await agent.startGoal({ id: "carrier", text: "Evaluate the neutral carrier fact.", query: "carrier(orion)", action: "simulated_carrier_action", actionPolicy });
    const decision = await agent.step();
    return {
      decision: decision.kind,
      ...(decision.reason === undefined ? {} : { reason: decision.reason }),
      policy: decision.provenance_policy.policy,
      observed_support_path_count: decision.provenance_policy.observed_support_path_count,
      eligible_support_path_count: decision.provenance_policy.eligible_support_path_count,
      selected_support_paths: decision.provenance_policy.selected_support_paths.map(support => ({
        fact_source_group_ids: support.fact_source_group_ids,
        fact_source_lineage_ids: support.fact_source_lineage_ids,
      })),
    };
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
}

async function buildReport(versionDescriptorPath, distinctDescriptorPath) {
  verify(versionDescriptorPath); verify(distinctDescriptorPath);
  const versionBytes = fs.readFileSync(versionDescriptorPath), distinctBytes = fs.readFileSync(distinctDescriptorPath);
  const versionDescriptor = JSON.parse(versionBytes), distinctDescriptor = JSON.parse(distinctBytes);
  const first = versionDescriptor.records.find(record => record.doi === versionDescriptor.requested_doi) || versionDescriptor.records[0];
  const copied = versionDescriptor.records.find(record => record.doi !== first.doi && record.source_group_attestation.lineage_id === first.source_group_attestation.lineage_id);
  const distinct = distinctDescriptor.records.find(record => record.source_group_attestation.lineage_id !== first.source_group_attestation.lineage_id);
  if (!copied || !distinct) throw new Error("descriptors do not contain the required shared and distinct lineages");
  const v2 = { minIndependentFactSupportPaths: 2, requireHostAttestedSourceGroups: true };
  const v3 = { minIndependentFactSupportPaths: 2, requireDistinctSourceLineages: true };
  const scenarios = {
    shared_recorded_lineage: {
      source_dois: [first.doi, copied.doi],
      lineage_ids: [first.source_group_attestation.lineage_id, copied.source_group_attestation.lineage_id],
      expected: { v2: "act", v3: "pause" },
      actual: { v2: await decisionFor([first, copied], v2, "shared-v2"), v3: await decisionFor([first, copied], v3, "shared-v3") },
    },
    distinct_recorded_lineages: {
      source_dois: [first.doi, distinct.doi],
      lineage_ids: [first.source_group_attestation.lineage_id, distinct.source_group_attestation.lineage_id],
      expected: { v2: "act", v3: "act" },
      actual: { v2: await decisionFor([first, distinct], v2, "distinct-v2"), v3: await decisionFor([first, distinct], v3, "distinct-v3") },
    },
  };
  for (const scenario of Object.values(scenarios)) for (const policy of ["v2", "v3"]) scenario.actual[policy].exact = scenario.actual[policy].decision === scenario.expected[policy];
  return {
    schema_version: "datacite-lineage-world-e2e-v1",
    experiment_kind: "external_metadata_engineering_replay",
    claim_boundary: "Real frozen DataCite relation metadata drives a neutral synthetic carrier fact through journal, checker and action policy. This does not validate the carrier fact, DataCite metadata truth, hidden-copy detection, or downstream utility.",
    inputs: {
      version_descriptor_sha256: sha256(versionBytes),
      distinct_descriptor_sha256: sha256(distinctBytes),
    },
    scenarios,
  };
}

async function main(argv = process.argv.slice(2)) {
  const versions = option(argv, "--versions"), distinct = option(argv, "--distinct"), out = option(argv, "--out");
  if (!versions || !distinct || !out) throw new Error("usage: node world/datacite-lineage-e2e.cjs --versions VERSIONS.json --distinct DISTINCT.json --out REPORT.json");
  const output = path.resolve(out);
  if (fs.existsSync(output)) throw new Error("refusing to overwrite DataCite E2E report");
  const report = await buildReport(path.resolve(versions), path.resolve(distinct));
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, { flag: "wx" });
  process.stdout.write(`${JSON.stringify({ status: "datacite-lineage-world-e2e-v1", exact: Object.values(report.scenarios).every(s => s.actual.v2.exact && s.actual.v3.exact), out: output })}\n`);
}

if (require.main === module) main().catch(error => { process.stderr.write(`${error.stack || error.message}\n`); process.exitCode = 1; });
module.exports = { buildReport, decisionFor };
