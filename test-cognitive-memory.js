"use strict";
const assert = require("node:assert/strict");
const { createSnapshot, createCandidate, runThought, admitCandidate, directConflicts, activeItems } = require("./cognitive-memory");
async function main() {
  const snapshot = createSnapshot({ id: "s0", items: [
    { id: "a1", program: "depends_on(orion, delta)", source: "turn(12)", status: "accepted" }, { id: "r1", program: "affected(X) :- vulnerable(X)", source: "turn(31)", status: "accepted" }, { id: "r2", program: "affected(X) :- depends_on(X, Y), affected(Y)", source: "turn(32)", status: "accepted" }, { id: "a2", program: "vulnerable(delta)", source: "turn(33)", status: "accepted" }
  ] });
  const candidate = createCandidate({ id: "p1", source: "turn(40)", program: "candidate_runs :- (member(_, [one,two]), true)." });
  const derived = await runThought({ snapshot, candidate, goal: "affected(orion)" }); assert.equal(derived.candidate.status, "candidate"); assert.equal(derived.runEvidence.result.status, "proved"); assert.equal(derived.runEvidence.result.proof.item_id, "r2"); assert.equal(derived.runEvidence.result.proof.children[1].item_id, "r1");
  const full = await runThought({ snapshot, candidate, goal: "candidate_runs" }); assert.equal(full.runEvidence.result.status, "proved"); assert.equal(full.runEvidence.result.proof.kind, "trace_unavailable");
  const absent = await runThought({ snapshot, candidate, goal: "requires_approval(orion, two)" }); assert.equal(absent.runEvidence.result.status, "unknown"); assert.match(JSON.stringify(absent.runEvidence.result.missing), /requires_approval/);
  const blocked = createCandidate({ id: "p2", source: "turn(41)", program: "escape_attempt :- open('/Users/artem/pam-escape-test', write, S), close(S)." }); const blockedResult = await runThought({ snapshot, candidate: blocked, goal: "escape_attempt" }); assert.equal(blockedResult.runEvidence.result.status, "error");
  const admitted = admitCandidate(snapshot, candidate, { admit: true, id: "human-1", source: "review(turn(42))" }); assert.equal(snapshot.items.length, 4); assert.equal(admitted.parentId, "s0"); assert.throws(() => admitCandidate(snapshot, candidate, { admit: false, id: "no", source: "x" }), /explicit/);
  const conflict = createSnapshot({ id: "direct", items: [
    { id: "old", program: "lives_in(user, samara)", source: "turn(1)", status: "accepted", proposition: "lives_in(user,samara)", polarity: "positive", validFrom: 20200101, validTo: 20201231 }, { id: "new", program: "lives_in(user, samara)", source: "turn(2)", status: "accepted", proposition: "lives_in(user,samara)", polarity: "negative", validFrom: 20200601, validTo: 20210101 }, { id: "past", program: "lives_in(user, samara)", source: "turn(3)", status: "accepted", proposition: "lives_in(user,samara)", polarity: "negative", validFrom: 20220101, validTo: null }
  ] }); assert.equal(directConflicts(conflict).length, 1); assert.equal(directConflicts(conflict)[0].left.source, "turn(1)");
  const revised = createSnapshot({ id: "revised", items: [...conflict.items, { id: "revision", program: "lives_in(user, kazan)", source: "turn(4)", status: "accepted", replaces: "old" }] }); assert.equal(activeItems(revised).some(item => item.id === "old"), false); assert.equal(directConflicts(revised).length, 0);
  console.log("cognitive-memory ok: isolated multi-hop proof, lifecycle, absence, and conflict fixtures");
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
