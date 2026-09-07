"use strict";
const assert = require("node:assert/strict");
const { runFreePrologDiagnostic } = require("./free-prolog-diagnostic");

(async () => {
  const program = `person(ada).\nperson(bob).\nready(ada).\nready(bob).\nall_ready :- forall(person(X), ready(X)).\n`;
  const observed = await runFreePrologDiagnostic({ caseId: "ordinary-prolog", program, query: "all_ready", timeoutMs: 1500 });
  assert.equal(observed.status, "observed-not-scored");
  assert.equal(observed.runtime.trust, "untrusted");
  assert.equal(observed.runtime.transcript.exitCode, 0);
  assert.equal(observed.execution_outcome, "succeeded");
  assert.equal(observed.program, program);
  const semanticProgram = `check(Status, Certificate) :- finite_status([domain(person,[ada])], [atom(paints,[ada]), xor(atom(paints,[ada]), atom(writes,[ada]))], atom(writes,[ada]), 16, Status, Certificate).\n`;
  const semantic = await runFreePrologDiagnostic({ caseId: "preloaded-semantics", program: semanticProgram, query: "check(Status, Certificate)", timeoutMs: 1500 });
  assert.equal(semantic.execution_outcome, "succeeded");
  assert.match(semantic.runtime.transcript.transcript, /PAM_DIAGNOSTIC_BINDINGS: check\(contradicted,/);
  console.log("free-prolog-diagnostic ok: ordinary agent-style Prolog executes as isolated non-scoring evidence");
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
