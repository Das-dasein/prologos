"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { check } = require("../checker");
const { buildFixture } = require("./generator.cjs");
const { POLICY_CONFIGS, decide, runFixture } = require("./run.cjs");

test("frozen policy ablation covers distinct adversarial strata exactly", () => {
  const fixture = buildFixture();
  assert.equal(fixture.cases.length, 11);
  assert.equal(new Set(fixture.cases.map(value => value.case_id)).size, 11);
  assert.deepEqual(fixture.policies, ["safe", "group_v1", "attested_v2", "lineage_v3"]);
  const report = runFixture(fixture, { fixture_sha256: "test", policy_implementation_sha256: "test" });
  assert.equal(report.records.length, 44);
  assert.equal(report.records.every(record => record.exact), true);
});

test("conflict control uses the real checker shape and host decision ordering", async () => {
  const actual = await check({
    snapshot: {
      ideas: { version: "ablation-conflict-control-v2", predicates: [{ name: "ready", arity: 1 }] },
      items: [{ id: "positive", source: "a", program: "ready(orion)." }, { id: "negative", source: "b", program: "neg(ready(orion))." }],
    },
    query: "ready(orion)",
  });
  const fixture = buildFixture().cases.find(value => value.case_id === "conflict_control").checker_result;
  assert.deepEqual({ raw_status: fixture.raw_status, safe_status: fixture.safe_status }, { raw_status: actual.raw_status, safe_status: actual.safe_status });
  for (const policy of Object.values(POLICY_CONFIGS)) assert.equal(decide(actual, policy).decision, "pause");
});

test("each added layer closes only its authored recorded-provenance class", () => {
  const fixture = buildFixture();
  const expected = Object.fromEntries(fixture.cases.map(value => [value.case_id, value.expected]));
  assert.equal(expected.same_group_duplicate.safe, "act");
  assert.equal(expected.same_group_duplicate.group_v1, "pause");
  assert.equal(expected.model_self_split.group_v1, "act");
  assert.equal(expected.model_self_split.attested_v2, "pause");
  assert.equal(expected.copied_publishers.attested_v2, "act");
  assert.equal(expected.copied_publishers.lineage_v3, "pause");
  assert.equal(expected.missing_lineage.attested_v2, "act");
  assert.equal(expected.missing_lineage.lineage_v3, "pause");
});
