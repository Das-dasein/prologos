"use strict";
const assert = require("node:assert/strict");
const { runFreePrologDiagnostic } = require("./free-prolog-diagnostic");

(async () => {
  const program = `person(ada).\nperson(bob).\nready(ada).\nready(bob).\nall_ready :- forall(person(X), ready(X)).\n`;
  const observed = await runFreePrologDiagnostic({ caseId: "ordinary-prolog", program, query: "all_ready", timeoutMs: 1500 });
  assert.equal(observed.status, "observed-not-scored");
  assert.equal(observed.runtime.trust, "untrusted");
  assert.equal(observed.runtime.transcript.exitCode, 0);
  assert.equal(observed.program, program);
  console.log("free-prolog-diagnostic ok: ordinary agent-style Prolog executes as isolated non-scoring evidence");
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
