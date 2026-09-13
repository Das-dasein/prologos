"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { compare } = require("./dream-policy-trajectory.cjs");

test("dream policy witness trades one human question for checker executions", async () => {
  const result = await compare();
  assert.equal(result.comparison.final_action_equal, true);
  assert.equal(result.missing.final_decision.kind, "act");
  assert.equal(result.dream.final_decision.kind, "act");
  assert.deepEqual(result.missing.questions_answered_yes, ["q(orion)."]);
  assert.deepEqual(result.dream.questions_answered_yes, ["q(orion)."]);
  assert.deepEqual(result.missing.cost, { queries: 2, branches: 0, questions: 1 });
  assert.deepEqual(result.dream.cost, { queries: 6, branches: 4, questions: 1 });
  assert.equal(result.comparison.question_saving_for_dream, 0);
  assert.equal(result.comparison.additional_checker_queries_for_dream, 4);
});
