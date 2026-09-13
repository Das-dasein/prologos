"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { generateFixture, sourceWorld, caseSpec } = require("./generator.cjs");

test("generated history names the copied assertion dependency and replacement", () => {
  const world = sourceWorld(caseSpec(3, "chain", "seed_fact", "positive_to_negative", 1));
  assert.deepEqual(world.copyItem.dependsOn, [world.oldItem.id]);
  assert.equal(world.newItem.replaces, world.oldItem.id);
  assert.equal(world.query, "tr001_approved(iris)");
  assert.match(world.copyItem.natural_language, /repeats this assertion exactly/);
  assert.equal(world.copyItem.natural_language.includes(world.oldItem.natural_language), true);
});

test("complete 36-case fixture has measured depth and prespecified ablation", async () => {
  const fixture = await generateFixture();
  assert.equal(fixture.cases.length, 36);
  assert.equal(new Set(fixture.cases.map(item => item.case_id)).size, 36);
  for (const item of fixture.cases) {
    const expected = item.stratum.transition === "positive_to_negative" ? "contradicted" : item.stratum.transition === "negative_to_positive" ? "entailed" : "unknown";
    assert.equal(item.oracle.status, expected, item.case_id);
    assert.equal(item.oracle.measured_rule_depth, expected === "unknown" ? 0 : item.stratum.depth, item.case_id);
    assert.equal(item.scorer_only.no_dependency_status, item.stratum.transition === "withdrawal" ? "entailed" : "conflict", item.case_id);
    assert.equal(item.prompts.p1.includes("TRUSTED CHECKER RECEIPT"), false);
    assert.equal(item.prompts.p2.includes("TRUSTED CHECKER RECEIPT"), true);
    assert.equal(item.prompts.p2.startsWith(item.prompts.p1), true);
    assert.equal(item.prompts.p0.includes(item.formal_world.query), false, item.case_id);
    assert.equal(item.prompts.p0.includes(item.case_id), false, item.case_id);
    assert.equal(item.prompts.p1.includes(item.case_id), false, item.case_id);
    assert.equal(/positive_stage|negative_stage|positive branch|negative branch/.test(item.prompts.p0), false, item.case_id);
    assert.equal(/positive_stage|negative_stage/.test(item.prompts.p1), false, item.case_id);
  }
});
