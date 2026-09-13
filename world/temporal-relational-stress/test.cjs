"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { caseSpec, generateFixture, sourceWorld } = require("./generator.cjs");

test("relational world has opaque names and two dependent source copies", () => {
  const spec = caseSpec(4, "relational_diamond", 2, "entailed", 1);
  const world = sourceWorld(spec, true);
  assert.equal(world.origins.length, 2);
  assert.equal(world.copies.length, 2);
  assert.equal(new Set(world.copies.flatMap(entry => entry.item.dependsOn)).size, 2);
  assert.equal(world.ideas.predicates.filter(predicate => predicate.arity === 2).length >= 2, true);
  assert.equal(world.query.includes("route"), false);
  assert.equal(world.fixed.some(item => /route_[ab]|positive|negative/.test(item.program)), false);
});

test("complete 32-case fixture satisfies status, depth, revision and ablation strata", async () => {
  const fixture = await generateFixture();
  assert.equal(fixture.cases.length, 32);
  assert.equal(new Set(fixture.cases.map(item => item.case_id)).size, 32);
  for (const item of fixture.cases) {
    assert.equal(item.oracle.status, item.stratum.status, item.case_id);
    assert.equal(item.oracle.measured_rule_depths.every(depth => depth === item.stratum.depth), true, item.case_id);
    assert.equal(item.scorer_only.no_dependency_status, "conflict", item.case_id);
    assert.equal(item.prompts.p2.startsWith(item.prompts.p1), true, item.case_id);
    assert.equal(item.prompts.p1.includes("TRUSTED CHECKER RECEIPT"), false, item.case_id);
    assert.equal(item.prompts.p1f.includes("dependsOn"), false, item.case_id);
    const flatIds = item.renderings.flat.split("\n").map(line => JSON.parse(line).id);
    assert.deepEqual(flatIds, item.scorer_only.active_item_ids, item.case_id);
    assert.deepEqual(item.formal_world.active_items.map(entry => entry.id), item.scorer_only.active_item_ids, item.case_id);
    assert.equal(item.prompts.p0.includes(item.case_id), false, item.case_id);
    assert.equal(item.prompts.p1.includes(item.case_id), false, item.case_id);
  }
});
