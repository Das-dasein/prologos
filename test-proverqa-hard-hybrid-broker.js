"use strict";
const assert = require("node:assert/strict");
const { compileHorn, createBroker } = require("./proverqa-hard-hybrid-broker");
(async () => {
  const compiled = compileHorn(["calm(Ada)", "∀x (calm(x) ∧ focused(x) → ready(x))", "focused(Ada)", "calm(Ada) ∨ alert(Ada)"]);
  assert.match(compiled.program, /ready\(X\) :- calm\(X\), focused\(X\)\./); assert.doesNotMatch(compiled.program, /alert/);
  assert.deepEqual(compiled.chain_goals, ["ready('Ada')"]);
  const broker = createBroker({ cases: [{ case_id: "case-1", private_formulas: ["calm(Ada)", "∀x (calm(x) ∧ focused(x) → ready(x))", "focused(Ada)"] }] });
  assert.deepEqual(broker.catalog("case-1"), ["g1", "g2", "g3"]);
  assert.deepEqual(broker.predeclaredGoal("case-1"), { goal_id: "g3", goal: "ready('Ada')", selection: "rule-head" });
  assert.equal((await broker.invoke({ caseId: "case-1", goalId: "g3" })).status, "entailed");
  await assert.rejects(() => broker.invoke({ caseId: "case-1", goalId: "ready(Ada)" }), /not predeclared/);
  console.log("proverqa-hard-hybrid-broker ok: fixed Horn projection and opaque goal gate");
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
