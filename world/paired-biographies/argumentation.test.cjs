"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const H = require("./harness.cjs");
const { analyzeRows } = require("./argumentation-analysis.cjs");

test("all authored paired biographies receive a bounded read-only argumentation projection", async () => {
  const { rows } = await H.loadDataset(), result = await analyzeRows(rows);
  assert.equal(result.summary.cases, 24);
  assert.deepEqual(result.summary.divergences, ["p03_b"]);
  const conflict = result.cases.find(c => c.case_id === "p03_b");
  assert.equal(conflict.safe_status, "unknown");
  assert.equal(conflict.dung.grounded_status, "unknown");
  assert.deepEqual(conflict.dung.preferred_statuses, ["contradicted", "entailed"]);
  const clean = result.cases.find(c => c.case_id === "p04_a");
  assert.equal(clean.safe_status, "entailed");
  assert.equal(clean.dung.grounded_status, "entailed");
  assert.deepEqual(clean.dung.preferred_statuses, ["entailed"]);
  const [paths] = clean.support_comparison.comparisons;
  assert.equal(paths.item_disjoint, true);
  assert.equal(paths.fact_source_disjoint, true);
  assert.equal(paths.rule_source_disjoint, false);
  assert.deepEqual(paths.rule_source_overlap, ["m_rules"]);
});
