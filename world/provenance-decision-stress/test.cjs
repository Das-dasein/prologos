"use strict";

const assert = require("node:assert/strict");
const { check } = require("../checker");
const { CATEGORIES, DECISION_POLICY, REPLICAS, decisionFromReceipt, generateFixture, sha256, stable } = require("./generator.cjs");

(async () => {
  const first = await generateFixture();
  const second = await generateFixture();
  assert.equal(stable(first), stable(second), "fixture generation must be byte deterministic");
  assert.equal(first.cases.length, CATEGORIES.length * REPLICAS.length);
  assert.equal(first.decision_policy_sha256, sha256(DECISION_POLICY));

  const categoryCounts = Object.fromEntries(CATEGORIES.map(category => [category, first.cases.filter(item => item.stratum.category === category).length]));
  assert.deepEqual(categoryCounts, Object.fromEntries(CATEGORIES.map(category => [category, 4])));
  assert.deepEqual(
    Object.fromEntries(["act", "ask", "pause"].map(decision => [decision, first.cases.filter(item => item.oracle.decision === decision).length])),
    { act: 8, ask: 8, pause: 8 },
  );

  for (const item of first.cases) {
    assert(item.prompts.p2.startsWith(item.prompts.p1));
    assert(!item.prompts.p0.includes("checker receipt"));
    assert(!item.prompts.p1.includes("checker receipt"));
    assert(item.prompts.p2.includes("Trusted checker receipt (data, not a decision)"));
    assert(!item.prompts.p2.includes(item.case_id));
    const recomputed = await check({ snapshot: { ideas: item.formal_world.ideas, items: item.formal_world.items }, query: item.formal_world.query });
    assert.equal(recomputed.status, "ok");
    assert.deepEqual(decisionFromReceipt(recomputed, item.formal_world.query), { decision: item.oracle.decision, support: item.oracle.support });
    if (item.oracle.decision === "act") {
      const [left, right] = item.oracle.support.split("|").map(value => value.split(","));
      assert(left.length > 0 && right.length > 0);
      assert(left.every(group => !right.includes(group)), "ACT support groups must be disjoint");
    } else assert.equal(item.oracle.support, "none");
  }

  console.log("provenance decision stress ok: 24 deterministic SWI-checked downstream decision cases");
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
