"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { evaluateActionProvenance } = require("../provenance-policy");

const POLICY_CONFIGS = {
  safe: null,
  group_v1: { minIndependentFactSupportPaths: 2 },
  attested_v2: { minIndependentFactSupportPaths: 2, requireHostAttestedSourceGroups: true },
  lineage_v3: { minIndependentFactSupportPaths: 2, requireDistinctSourceLineages: true },
};

function sha256(buffer) { return crypto.createHash("sha256").update(buffer).digest("hex"); }

function decide(result, policy) {
  if (result.status !== "ok") return { decision: "pause", reason: "checker_failure" };
  if (result.raw_status === "conflict") return { decision: "pause", reason: "conflict" };
  if (result.safe_status === "contradicted") return { decision: "pause", reason: "contradicted" };
  if (result.safe_status === "unknown") return { decision: "ask", reason: "missing_support" };
  if (result.safe_status !== "entailed") return { decision: "pause", reason: "unsupported_status" };
  if (!policy) return { decision: "act", reason: "safe_entailment" };
  const evaluation = evaluateActionProvenance(result, result.query, policy);
  return {
    decision: evaluation.satisfied ? "act" : "pause",
    reason: evaluation.satisfied ? "provenance_threshold_satisfied" : "insufficient_independent_fact_support",
    evaluation,
  };
}

function decideV1(result, policy) {
  if (result.status !== "ok") return { decision: "pause", reason: "checker_failure" };
  if (result.safe_status === "conflict" || result.safe_status === "contradicted") return { decision: "pause", reason: result.safe_status };
  if (result.safe_status === "unknown") return { decision: "ask", reason: "missing_support" };
  if (result.safe_status !== "entailed") return { decision: "pause", reason: "unsupported_status" };
  if (!policy) return { decision: "act", reason: "safe_entailment" };
  const evaluation = evaluateActionProvenance(result, result.query, policy);
  return { decision: evaluation.satisfied ? "act" : "pause", reason: evaluation.satisfied ? "provenance_threshold_satisfied" : "insufficient_independent_fact_support", evaluation };
}

function runFixture(fixture, metadata) {
  const version = fixture.schema_version === "provenance-policy-ablation-fixture-v1" ? 1 : 2;
  if (!["provenance-policy-ablation-fixture-v1", "provenance-policy-ablation-fixture-v2"].includes(fixture.schema_version)) throw new Error("unsupported provenance ablation fixture schema");
  const decisionFunction = version === 1 ? decideV1 : decide;
  const records = [];
  for (const testCase of fixture.cases) {
    for (const policyId of fixture.policies) {
      const outcome = decisionFunction(testCase.checker_result, POLICY_CONFIGS[policyId]);
      records.push({
        case_id: testCase.case_id,
        attack_class: testCase.attack_class,
        policy: policyId,
        expected_decision: testCase.expected[policyId],
        actual_decision: outcome.decision,
        exact: outcome.decision === testCase.expected[policyId],
        reason: outcome.reason,
        ...(outcome.evaluation ? { provenance_policy: outcome.evaluation } : {}),
      });
    }
  }
  const summary = {};
  for (const policyId of fixture.policies) {
    const selected = records.filter(record => record.policy === policyId);
    summary[policyId] = {
      cases: selected.length,
      exact: selected.filter(record => record.exact).length,
      acts: selected.filter(record => record.actual_decision === "act").length,
      asks: selected.filter(record => record.actual_decision === "ask").length,
      pauses: selected.filter(record => record.actual_decision === "pause").length,
    };
  }
  return {
    schema_version: `provenance-policy-ablation-report-v${version}`,
    experiment_kind: "deterministic_synthetic_policy_ablation",
    claim_boundary: "Shows policy behavior on authored recorded-provenance attacks; does not measure LLM quality, source truth, hidden copying detection, or real-world independence.",
    ...metadata,
    records,
    summary,
  };
}

function main(argv = process.argv.slice(2)) {
  if (argv.length !== 2) throw new Error("usage: node run.cjs FIXTURE.json REPORT.json");
  const fixturePath = path.resolve(argv[0]);
  const reportPath = path.resolve(argv[1]);
  const fixtureBytes = fs.readFileSync(fixturePath);
  const implementationPath = path.resolve(__dirname, "../provenance-policy.js");
  const report = runFixture(JSON.parse(fixtureBytes), {
    fixture_sha256: sha256(fixtureBytes),
    policy_implementation_sha256: sha256(fs.readFileSync(implementationPath)),
  });
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report.summary)}\n`);
}

if (require.main === module) main();
module.exports = { POLICY_CONFIGS, decide, decideV1, runFixture, sha256 };
