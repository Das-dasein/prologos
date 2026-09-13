"use strict";

const fs = require("node:fs");
const path = require("node:path");

function support(id, group, assurance, lineage) {
  return {
    literal: "ready(orion)",
    item_ids: [id],
    fact_source_group_ids: [group],
    rule_source_group_ids: [],
    fact_source_group_assurances: [{
      source_group_id: group,
      assurances: assurance ? [assurance] : [],
      lineage_ids: lineage ? [lineage] : [],
    }],
  };
}

function result(rawStatus, supports = [], safeStatus = rawStatus) {
  return {
    status: "ok",
    query: "ready(orion)",
    raw_status: rawStatus,
    safe_status: safeStatus,
    safe_support_sets: supports,
  };
}

function buildFixture() {
  const attested = (id, group, lineage) => support(id, group, "host_attested", lineage);
  return {
    schema_version: "provenance-policy-ablation-fixture-v2",
    purpose: "Deterministic checker-shaped policy-layer ablation; no LLM calls and no real-world source-independence claim.",
    query: "ready(orion)",
    policies: ["safe", "group_v1", "attested_v2", "lineage_v3"],
    cases: [
      {
        case_id: "independent_lineages",
        attack_class: "none_recorded",
        checker_result: result("entailed", [attested("i1", "publisher_a", "origin_a"), attested("i2", "publisher_b", "origin_b")]),
        expected: { safe: "act", group_v1: "act", attested_v2: "act", lineage_v3: "act" },
      },
      {
        case_id: "copied_publishers",
        attack_class: "known_common_origin",
        checker_result: result("entailed", [attested("i1", "publisher_a", "wire_1"), attested("i2", "publisher_b", "wire_1")]),
        expected: { safe: "act", group_v1: "act", attested_v2: "act", lineage_v3: "pause" },
      },
      {
        case_id: "model_self_split",
        attack_class: "untrusted_group_multiplication",
        checker_result: result("entailed", [support("i1", "event_1", "event_local"), support("i2", "event_2", "event_local")]),
        expected: { safe: "act", group_v1: "act", attested_v2: "pause", lineage_v3: "pause" },
      },
      {
        case_id: "host_declared_split",
        attack_class: "unattested_group_multiplication",
        checker_result: result("entailed", [support("i1", "declared_a", "host_declared"), support("i2", "declared_b", "host_declared")]),
        expected: { safe: "act", group_v1: "act", attested_v2: "pause", lineage_v3: "pause" },
      },
      {
        case_id: "mixed_attested_local",
        attack_class: "mixed_trust_support",
        checker_result: result("entailed", [attested("i1", "publisher_a", "origin_a"), support("i2", "event_2", "event_local")]),
        expected: { safe: "act", group_v1: "act", attested_v2: "pause", lineage_v3: "pause" },
      },
      {
        case_id: "same_group_duplicate",
        attack_class: "item_duplication",
        checker_result: result("entailed", [attested("i1", "publisher_a", "origin_a"), attested("i2", "publisher_a", "origin_a")]),
        expected: { safe: "act", group_v1: "pause", attested_v2: "pause", lineage_v3: "pause" },
      },
      {
        case_id: "missing_lineage",
        attack_class: "unclassified_upstream_origin",
        checker_result: result("entailed", [support("i1", "publisher_a", "host_attested"), support("i2", "publisher_b", "host_attested")]),
        expected: { safe: "act", group_v1: "act", attested_v2: "act", lineage_v3: "pause" },
      },
      {
        case_id: "single_attested_support",
        attack_class: "insufficient_support_count",
        checker_result: result("entailed", [attested("i1", "publisher_a", "origin_a")]),
        expected: { safe: "act", group_v1: "pause", attested_v2: "pause", lineage_v3: "pause" },
      },
      {
        case_id: "unknown_control",
        attack_class: "epistemic_unknown",
        checker_result: result("unknown"),
        expected: { safe: "ask", group_v1: "ask", attested_v2: "ask", lineage_v3: "ask" },
      },
      {
        case_id: "conflict_control",
        attack_class: "epistemic_conflict",
        checker_result: result("conflict", [attested("i1", "publisher_a", "origin_a"), attested("i2", "publisher_b", "origin_b")], "unknown"),
        expected: { safe: "pause", group_v1: "pause", attested_v2: "pause", lineage_v3: "pause" },
      },
      {
        case_id: "contradicted_control",
        attack_class: "epistemic_contradicted",
        checker_result: result("contradicted"),
        expected: { safe: "pause", group_v1: "pause", attested_v2: "pause", lineage_v3: "pause" },
      },
    ],
  };
}

function main(argv = process.argv.slice(2)) {
  const index = argv.indexOf("--out");
  if (index < 0 || !argv[index + 1]) throw new Error("usage: node generator.cjs --out FIXTURE.json");
  const output = path.resolve(argv[index + 1]);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(buildFixture(), null, 2)}\n`);
  process.stdout.write(`${output}\n`);
}

if (require.main === module) main();
module.exports = { buildFixture };
