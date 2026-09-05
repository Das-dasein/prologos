"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createSnapshot, createCandidate, runThought, admitCandidate, directConflicts, activeItems } = require("./cognitive-memory");
async function main() {
  const snapshot = createSnapshot({ id: "s0", items: [
    { id: "a1", program: "depends_on(orion, delta)", source: "turn(12)", status: "accepted" }, { id: "r1", program: "affected(X) :- vulnerable(X)", source: "turn(31)", status: "accepted" }, { id: "r2", program: "affected(X) :- depends_on(X, Y), affected(Y)", source: "turn(32)", status: "accepted" }, { id: "a2", program: "vulnerable(delta)", source: "turn(33)", status: "accepted" }
  ] });
  const candidate = createCandidate({ id: "p1", source: "turn(40)", program: "candidate_runs :- (member(_, [one,two]), true)." });
  const derived = await runThought({ snapshot, candidate, goal: "affected(orion)" }); assert.equal(derived.candidate.status, "candidate"); assert.equal(derived.runEvidence.result.status, "proved"); assert.equal(derived.runEvidence.result.proof.item_id, "r2"); assert.equal(derived.runEvidence.result.proof.children[1].item_id, "r1");
  const full = await runThought({ snapshot, candidate, goal: "candidate_runs" }); assert.equal(full.runEvidence.result.status, "proved"); assert.equal(full.runEvidence.result.proof.kind, "trace_unavailable");
  const absent = await runThought({ snapshot, candidate, goal: "requires_approval(orion, two)" }); assert.equal(absent.runEvidence.result.status, "unknown"); assert.match(JSON.stringify(absent.runEvidence.result.missing), /requires_approval/);
  const hostRead = createCandidate({ id: "p2", source: "turn(41)", program: "host_read :- open('/etc/hosts', read, S), get_char(S, C), close(S), nonvar(C)." });
  const hostReadResult = await runThought({ snapshot, candidate: hostRead, goal: "host_read" }); assert.equal(hostReadResult.runEvidence.result.status, "error");
  const packageManagerRead = createCandidate({ id: "p2b", source: "turn(41)", program: "package_manager_read :- open('/opt/homebrew/.gitignore', read, S), get_char(S, C), close(S), nonvar(C)." });
  const packageManagerReadResult = await runThought({ snapshot, candidate: packageManagerRead, goal: "package_manager_read" }); assert.equal(packageManagerReadResult.runEvidence.result.status, "error");
  const externalWrite = path.join(os.tmpdir(), `pam-external-write-${process.pid}`); fs.rmSync(externalWrite, { force: true });
  const hostWrite = createCandidate({ id: "p3", source: "turn(42)", program: `host_write :- open(${JSON.stringify(externalWrite)}, write, S), write(S, escaped), close(S).` });
  const hostWriteResult = await runThought({ snapshot, candidate: hostWrite, goal: "host_write" }); assert.equal(hostWriteResult.runEvidence.result.status, "error"); assert.equal(fs.existsSync(externalWrite), false);
  const network = createCandidate({ id: "p4", source: "turn(43)", program: ":- use_module(library(socket)).\nnetwork_probe :- tcp_socket(S), tcp_connect(S, ip(1,1,1,1):80), close(S)." });
  const networkResult = await runThought({ snapshot, candidate: network, goal: "network_probe" }); assert.equal(networkResult.runEvidence.result.status, "error"); assert.match(networkResult.runEvidence.result.error, /socket|permission|operation/i);
  const oversizedOutput = createCandidate({ id: "p5", source: "turn(44)", program: "oversized_output :- open('over-limit', write, S), forall(between(1, 400000, _), put_byte(S, 120)), close(S)." });
  await assert.rejects(() => runThought({ snapshot, candidate: oversizedOutput, goal: "oversized_output", timeoutMs: 1500, maxOutputBytes: 1024 }), /isolated Prolog run failed/);
  const admitted = admitCandidate(snapshot, candidate, { admit: true, id: "human-1", source: "review(turn(42))" }); assert.equal(snapshot.items.length, 4); assert.equal(admitted.parentId, "s0"); assert.throws(() => admitCandidate(snapshot, candidate, { admit: false, id: "no", source: "x" }), /explicit/);
  const conflict = createSnapshot({ id: "direct", items: [
    { id: "old", program: "lives_in(user, samara)", source: "turn(1)", status: "accepted", proposition: "lives_in(user,samara)", polarity: "positive", validFrom: 20200101, validTo: 20201231 }, { id: "new", program: "lives_in(user, samara)", source: "turn(2)", status: "accepted", proposition: "lives_in(user,samara)", polarity: "negative", validFrom: 20200601, validTo: 20210101 }, { id: "past", program: "lives_in(user, samara)", source: "turn(3)", status: "accepted", proposition: "lives_in(user,samara)", polarity: "negative", validFrom: 20220101, validTo: null }
  ] }); assert.equal(directConflicts(conflict).length, 1); assert.equal(directConflicts(conflict)[0].left.source, "turn(1)");
  const revised = createSnapshot({ id: "revised", items: [...conflict.items, { id: "revision", program: "lives_in(user, kazan)", source: "turn(4)", status: "accepted", replaces: "old" }] }); assert.equal(activeItems(revised).some(item => item.id === "old"), false); assert.equal(directConflicts(revised).length, 0);
  console.log("cognitive-memory ok: isolated multi-hop proof, lifecycle, absence, and conflict fixtures");
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
