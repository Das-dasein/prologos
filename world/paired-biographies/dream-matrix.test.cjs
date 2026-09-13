"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const H = require("./harness.cjs"), M = require("./dream-matrix.cjs");

test("dream matrix admits only explicit even replicated plans and counterbalances order", async () => {
  const rows = (await H.loadDataset()).rows, plan = M.cells(rows, 2);
  assert.equal(plan.length, 20);
  assert.deepEqual([...new Set(plan.map(cell => cell.case_id))], ["p01_a", "p05_b", "p06_b", "p07_b", "p08_b"]);
  for (const id of new Set(plan.map(cell => cell.case_id))) {
    const rowsForCase = plan.filter(cell => cell.case_id === id);
    assert.deepEqual(rowsForCase.map(cell => `${cell.repetition}:${cell.mode}`), [`1:checked_prolog`, `1:${H.DREAM_MODE}`, `2:${H.DREAM_MODE}`, `2:checked_prolog`]);
  }
  assert.equal(M.options(["--repetitions", "2", "--out", "/tmp/matrix"]).repetitions, 2);
  assert.throws(() => M.options(["--repetitions", "3", "--out", "/tmp/matrix"]));
});
test("secondary decision surface relaxes only a sole checker receipt wire failure", () => {
  assert.equal(M.decisionCorrect({ move: {}, failures: [] }), true);
  assert.equal(M.decisionCorrect({ move: {}, failures: ["required checked receipt\n..."] }), true);
  assert.equal(M.decisionCorrect({ move: {}, failures: ["question target"] }), false);
  assert.equal(M.decisionCorrect({ move: {}, failures: ["required checked receipt", "question target"] }), false);
});
