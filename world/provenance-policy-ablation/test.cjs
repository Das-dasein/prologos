"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildFixture } = require("./generator.cjs");
const { runFixture } = require("./run.cjs");

test("frozen policy ablation covers distinct adversarial strata exactly", () => {
  const fixture = buildFixture();
  assert.equal(fixture.cases.length, 11);
  assert.equal(new Set(fixture.cases.map(value => value.case_id)).size, 11);
  assert.deepEqual(fixture.policies, ["safe", "group_v1", "attested_v2", "lineage_v3"]);
  const report = runFixture(fixture, { fixture_sha256: "test", policy_implementation_sha256: "test" });
  assert.equal(report.records.length, 44);
  assert.equal(report.records.every(record => record.exact), true);
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
