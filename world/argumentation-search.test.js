"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { searchBasis } = require("./argumentation-search.cjs");

test("bounded signed-Horn search records where safe, grounded and preferred differ", async () => {
  const result = await searchBasis();
  assert.equal(result.boundary.worlds, 1024);
  assert.equal(result.summary.safe_grounded_divergences, 0);
  assert.equal(result.summary.safe_preferred_divergences, 590);
  assert.equal(result.witnesses.first_safe_grounded_divergence, null);
  assert.deepEqual(result.witnesses.first_preferred_divergence.programs, ["r(orion).", "neg(r(orion))."]);
  const structured = result.witnesses.structured_premise_attack;
  assert.deepEqual(structured.programs, ["p(orion).", "neg(p(orion)).", "q(orion).", "r(X) :- p(X).", "r(X) :- q(X).", "neg(r(X)) :- p(X)."]);
  assert.equal(structured.safe_status, "unknown");
  assert.equal(structured.grounded_status, "unknown");
  assert.deepEqual(structured.preferred_statuses, ["contradicted", "entailed"]);
});
