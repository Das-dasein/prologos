"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createSnapshot, createCandidate, runThought, runTrustedQuery, admitCandidate, directConflicts, activeItems } = require("./cognitive-memory");
async function main() {
  const snapshot = createSnapshot({ id: "s0", items: [
    { id: "a1", program: "depends_on(orion, delta)", source: "turn(12)", status: "accepted" }, { id: "r1", program: "affected(X) :- vulnerable(X)", source: "turn(31)", status: "accepted" }, { id: "r2", program: "affected(X) :- depends_on(X, Y), affected(Y)", source: "turn(32)", status: "accepted" }, { id: "a2", program: "vulnerable(delta)", source: "turn(33)", status: "accepted" }
  ] });
  const candidate = createCandidate({ id: "p1", source: "turn(40)", program: "candidate_runs :- (member(_, [one,two]), true)." });
  const thought = await runThought({ snapshot, candidate, goal: "candidate_runs" }); assert.equal(thought.candidate.status, "candidate"); assert.equal(thought.runEvidence.trust, "untrusted"); assert.equal(typeof thought.runEvidence.transcript.transcript, "string");
  const derived = await runTrustedQuery({ snapshot, goal: "affected(orion)" }); assert.equal(derived.proof.result.status, "proved"); assert.equal(derived.proof.result.proof.item_id, "r2"); assert.equal(derived.proof.result.proof.children[1].item_id, "r1");
  const absent = await runTrustedQuery({ snapshot, goal: "requires_approval(orion, two)" }); assert.equal(absent.proof.result.status, "unknown"); assert.match(JSON.stringify(absent.proof.result.missing), /requires_approval/);
  const hostRead = createCandidate({ id: "p2", source: "turn(41)", program: "host_read :- open('/etc/hosts', read, S), get_char(S, C), close(S), nonvar(C)." });
  const hostReadResult = await runThought({ snapshot, candidate: hostRead, goal: "host_read" }); assert.match(hostReadResult.runEvidence.transcript.transcript, /permission|error/i);
  const packageManagerRead = createCandidate({ id: "p2b", source: "turn(41)", program: "package_manager_read :- open('/opt/homebrew/.gitignore', read, S), get_char(S, C), close(S), nonvar(C)." });
  const packageManagerReadResult = await runThought({ snapshot, candidate: packageManagerRead, goal: "package_manager_read" }); assert.match(packageManagerReadResult.runEvidence.transcript.transcript, /permission|error/i);
  const externalWrite = path.join(os.tmpdir(), `pam-external-write-${process.pid}`); fs.rmSync(externalWrite, { force: true });
  const hostWrite = createCandidate({ id: "p3", source: "turn(42)", program: `host_write :- open(${JSON.stringify(externalWrite)}, write, S), write(S, escaped), close(S).` });
  const hostWriteResult = await runThought({ snapshot, candidate: hostWrite, goal: "host_write" }); assert.match(hostWriteResult.runEvidence.transcript.transcript, /permission|error/i); assert.equal(fs.existsSync(externalWrite), false);
  const network = createCandidate({ id: "p4", source: "turn(43)", program: ":- use_module(library(socket)).\nnetwork_probe :- tcp_socket(S), tcp_connect(S, ip(1,1,1,1):80), close(S)." });
  const networkResult = await runThought({ snapshot, candidate: network, goal: "network_probe" }); assert.match(networkResult.runEvidence.transcript.transcript, /socket|permission|operation|error/i);
  const splitFileOutput = createCandidate({ id: "p5", source: "turn(44)", program: "split_file_output :- forall(between(1,3,N),(atom_concat('part-',N,F),open(F,write,S),put_byte(S,120),close(S)))." });
  const splitFileResult = await runThought({ snapshot, candidate: splitFileOutput, goal: "split_file_output" }); assert.match(splitFileResult.runEvidence.transcript.transcript, /permission|error/i);
  const oversizedOutput = createCandidate({ id: "p6", source: "turn(45)", program: "oversized_output :- forall(between(1, 400000, _), put_byte(user_output, 120))." });
  await assert.rejects(() => runThought({ snapshot, candidate: oversizedOutput, goal: "oversized_output", timeoutMs: 1500, maxOutputBytes: 1024 }), /output exceeded maxOutputBytes/);
  const loop = createCandidate({ id: "p7", source: "turn(46)", program: "loop :- loop." });
  const timeout = await runThought({ snapshot, candidate: loop, goal: "loop", timeoutMs: 1100 }); assert.match(timeout.runEvidence.transcript.transcript, /time.?limit/i);
  const forged = createCandidate({ id: "p8", source: "turn(47)", program: ":- initialization((write('{\\\"status\\\":\\\"proved\\\",\\\"bindings\\\":\\\"forged\\\",\\\"proof\\\":{}}'), nl, halt)).\nnever." });
  const forgedThought = await runThought({ snapshot, candidate: forged, goal: "never" }); assert.equal(forgedThought.runEvidence.trust, "untrusted"); assert.match(forgedThought.runEvidence.transcript.transcript, /forged/);
  const trustedAfterForgery = await runTrustedQuery({ snapshot, goal: "never" }); assert.equal(trustedAfterForgery.proof.result.status, "unknown"); assert.doesNotMatch(JSON.stringify(trustedAfterForgery.proof.result), /forged/);
  const admittedForgery = admitCandidate(snapshot, forged, { admit: true, id: "human-raw-1", source: "review(turn(47))" });
  const trustedAfterAdmission = await runTrustedQuery({ snapshot: admittedForgery, goal: "never" }); assert.equal(trustedAfterAdmission.proof.result.status, "unknown"); assert.doesNotMatch(JSON.stringify(trustedAfterAdmission.proof.result), /forged/);
  const admitted = admitCandidate(snapshot, candidate, { admit: true, id: "human-1", source: "review(turn(42))" }); assert.equal(snapshot.items.length, 4); assert.equal(admitted.parentId, "s0"); assert.throws(() => admitCandidate(snapshot, candidate, { admit: false, id: "no", source: "x" }), /explicit/);
  const conflict = createSnapshot({ id: "direct", items: [
    { id: "old", program: "lives_in(user, samara)", source: "turn(1)", status: "accepted", proposition: "lives_in(user,samara)", polarity: "positive", validFrom: 20200101, validTo: 20201231 }, { id: "new", program: "lives_in(user, samara)", source: "turn(2)", status: "accepted", proposition: "lives_in(user,samara)", polarity: "negative", validFrom: 20200601, validTo: 20210101 }, { id: "past", program: "lives_in(user, samara)", source: "turn(3)", status: "accepted", proposition: "lives_in(user,samara)", polarity: "negative", validFrom: 20220101, validTo: null }
  ] }); assert.equal(directConflicts(conflict).length, 1); assert.equal(directConflicts(conflict)[0].left.source, "turn(1)");
  const revised = createSnapshot({ id: "revised", items: [...conflict.items, { id: "revision", program: "lives_in(user, kazan)", source: "turn(4)", status: "accepted", replaces: "old" }] }); assert.equal(activeItems(revised).some(item => item.id === "old"), false); assert.equal(directConflicts(revised).length, 0);
  console.log("cognitive-memory ok: isolated untrusted thought, trusted multi-hop proof, lifecycle, absence, and conflict fixtures");
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
