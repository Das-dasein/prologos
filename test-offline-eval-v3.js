"use strict";
const assert = require("node:assert/strict");
const { contentVerdict, normalizeFact, sameContent, answerResult } = require("./offline-eval-v3");
function fact(args) { return normalizeFact({ relation: "lives_in", arguments: args, polarity: "positive", valid_from: null, valid_to: null }, 1); }
assert.equal(sameContent(fact(["user", "samara"]), fact(["user", "samara"])), true);
assert.equal(sameContent(fact(["user", "samara"]), fact(["user", "samara"])), true, "runtime id is intentionally absent from content matching");
assert.equal(contentVerdict("correction-02", "The current project at Acme is Borealis.").status, "pass");
assert.equal(contentVerdict("correction-02", "The projects are Atlas and Borealis.").status, "fail");
assert.equal(contentVerdict("conflict-01", "The conflict is unresolved; I cannot choose whether you like coffee.").status, "pass");
assert.equal(contentVerdict("conflict-01", "You like coffee.").status, "fail");
assert.equal(contentVerdict("ambiguity-02", "Please clarify which person they refers to.").status, "pass");
assert.equal(contentVerdict("ambiguity-02", "They use Python.").status, "fail");
const expected = { expected: "user lives in samara", source_claim_ids: ["c"], source_turns: [1], intervals: [[10000101,"inf"]], stale_or_contradictory: 0 };
const answer = { answer: { text: "Samara", provenance_claim_ids: ["runtime-id"], source_turns: [1], intervals: [[10000101,"inf"]] } };
assert.equal(answerResult({case_id:"stable-01"}, answer, expected).provenance.status, "pass");
assert.equal(answerResult({case_id:"stable-01"}, {answer:{text:"Samara"}}, expected).provenance.status, "unknown");
console.log("offline-eval-v3 sentinels: PASS");
