"use strict";
const assert = require("node:assert/strict");
const os = require("node:os");
const path = require("node:path");
const { collect, plan } = require("./proverqa-hard-hybrid-collector");
(async () => {
  const fixture = { cases: [{ case_id: "case-1", source_answer: "A", hybrid_quantifier_case: true, p0: { context: "Ada is calm.", question: "Is Ada ready?" }, p1: { representation: "statement(1, atom(calm('Ada'))).", query_term: "query(atom(ready('Ada')))." }, private_formulas: ["calm(Ada)", "focused(Ada)", "∀x (calm(x) ∧ focused(x) → ready(x))"] }] };
  assert.equal(plan(fixture).length, 3);
  const root = path.join(os.tmpdir(), `proverqa-collector-${process.pid}-${Date.now()}`);
  const seen = [];
  const collection = await collect({ fixture, rawRoot: root, provider: { async complete(input) {
    seen.push(input); if (input.condition === "P2") { assert.ok(input.broker); const receipt = (await input.broker.invoke({ caseId: input.caseId, goalId: "g3" })).receipt; return { answer: "RESULT: A", broker_receipt: receipt, usage: { input_tokens: 1 } }; }
    assert.equal(input.broker, undefined); return { answer: "RESULT: A", usage: { input_tokens: 1 } };
  } } });
  assert.equal(collection.records.length, 3);
  assert.doesNotMatch(seen[0].prompt, /broker|tool/i); assert.doesNotMatch(seen[1].prompt, /broker|tool/i); assert.match(seen[2].prompt, /bounded chain broker/i);
  assert.equal(collection.records[2].broker_receipt.broker_goal, "ready('Ada')");
  console.log("proverqa-hard-hybrid-collector ok: P0/P1 broker isolation and one bounded P2 receipt");
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
