"use strict";
const assert = require("node:assert");
const { score } = require("./cdr-matrix-harness");
const result = score(require("node:fs").readFileSync(".cdr/datasets/dialogues-pilot-v1.jsonl", "utf8").trim().split(/\r?\n/).map(JSON.parse));
assert.equal(result.case_count, 12);
assert.equal(result.turn_count, 36);
for (const value of Object.values(result.category_metrics)) assert.equal(value.turns, 6);
console.log("cdr matrix ok");
