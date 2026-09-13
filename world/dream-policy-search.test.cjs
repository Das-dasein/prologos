"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { search } = require("./dream-policy-search.cjs");

test("bounded dream policy search preserves the missing-policy semantic next move", async () => {
  const result = await search({ components: [["p", "p(orion)."], ["q", "q(orion)."], ["rule_pq", "release(X) :- p(X), q(X)."]], questionSets: [[], ["p"], ["q"], ["p", "q"]] });
  assert.equal(result.summary.total, 32); assert.equal(result.summary.differences, 0);
  const sequential = result.cases.find(row => row.components.join(",") === "rule_pq" && row.questions.join(",") === "p,q");
  assert.deepEqual(sequential.missing, { kind: "ask", target: "p(orion)" });
  assert.deepEqual(sequential.dream, { kind: "ask", target: "p(orion)" });
});
test("shortest-plan missing policy removes the former decision-relevance witness", async () => {
  const result = await search({ components: [["p", "p(orion)."], ["q", "q(orion)."], ["rule_q", "release(X) :- q(X)."], ["rule_pq", "release(X) :- p(X), q(X)."]], questionSets: [["p", "q"]] });
  const differences = result.cases.filter(row => !row.equal);
  assert.equal(differences.length, 0);
  const witness = result.cases.find(row => row.components.join(",") === "rule_q,rule_pq");
  assert.deepEqual(witness.missing, { kind: "ask", target: "q(orion)" });
  assert.deepEqual(witness.dream, { kind: "ask", target: "q(orion)" });
});
