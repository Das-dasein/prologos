"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { collect, needsRepair, promptFor, relevantExecutorEvidence, renderFrozenPrompt, repairPrompt } = require("./free-prolog-diagnostic-collector");

(async () => {
  const fixture = { schema_version: "free-prolog-diagnostic-fixture-v1", cases: [{ case_id: "small", context: "Ada is ready.", question: "Is Ada ready?" }] };
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "free-prolog-collector-"));
  try {
    const bindingExample = "forall(var(x,person),implies(calm(var(x)),ready(var(x))))";
    assert.equal(promptFor(fixture.cases[0]).includes(bindingExample), true);
    const previous = { program: "probe.", query: "probe" };
    assert.equal(renderFrozenPrompt({ initial_addon: "Goal {{goal}}", prompt_id: "test" }, { goal: "ready(ada)" }).initial_addon, "Goal ready(ada)");
    assert.throws(() => renderFrozenPrompt({ initial_addon: "Goal {{goal}}", prompt_id: "test" }, { other: "x" }), /unrendered/);
    const audited = { runtime: { transcript: { transcript: "outside_declared_domains([constant('X',source_axioms([s13]),goal(false))])" } } };
    const repair = repairPrompt(fixture.cases[0], previous, audited, null);
    assert.equal(repair.includes(bindingExample), true);
    assert.match(repair, /incorrectly written reference to a quantified variable/);
    assert.match(repair, /must not be added merely to silence the audit/);
    const cleanAudit = { runtime: { transcript: { transcript: "outside_declared_domains([])" } } };
    assert.doesNotMatch(repairPrompt(fixture.cases[0], previous, cleanAudit, null), /For each listed constant/);
    const compact = repairPrompt(fixture.cases[0], previous, { runtime: { transcript: { transcript: "Warning: noise\nERROR: Syntax error: Operator expected\nPAM_DIAGNOSTIC_OUTCOME: error" } } }, null, { repair_instruction: "Repair." }, true);
    assert.match(compact, /Syntax error/); assert.doesNotMatch(compact, /Warning: noise/); assert.doesNotMatch(compact, /World:/); assert.equal(relevantExecutorEvidence({ runtime: { transcript: { transcript: "Warning: noise\nERROR: bad" } } }, null), "ERROR: bad");
    assert.match(promptFor(fixture.cases[0]), /ordinary SWI-Prolog source/); assert.doesNotMatch(promptFor(fixture.cases[0]), /self-check/); assert.match(promptFor(fixture.cases[0], "v2-self-check"), /self-check/); assert.match(promptFor(fixture.cases[0], "v3-optional-semantics"), /finite_status/); assert.match(promptFor(fixture.cases[0], "v4-surface-semantics"), /semantic_status/); assert.match(promptFor(fixture.cases[0], "v5-relevant-slice"), /semantic_slice_status/); assert.match(promptFor(fixture.cases[0], "v6-complete-trace"), /complete auditable formalization/); assert.match(promptFor(fixture.cases[0], "v7-labelled-countermodel"), /labelled_semantic_status/); assert.match(promptFor(fixture.cases[0], "v8-reflect-then-formalize"), /meta_help/);
    const result = await collect({ fixture, rawRoot: path.join(parent, "raw"), promptVersion: "v2-self-check", generate: async () => ({ program: "ready(ada).\n", query: "ready(ada)", transport: { provider: "test" } }) });
    assert.equal(result.status, "observed-not-scored"); assert.equal(result.prompt_version, "v2-self-check"); assert.equal(result.records.length, 1); assert.equal(result.records[0].generated.transport.provider, "test"); assert.equal(result.records[0].observation.runtime.transcript.exitCode, 0); assert.equal(result.records[0].observation.execution_outcome, "succeeded"); assert.equal(result.records[0].transport_error, null);
    const repaired = await collect({ fixture, rawRoot: path.join(parent, "repair-raw"), maxRepairAttempts: 1, generate: async ({ stage, prompt }) => stage === "initial" ? ({ program: "ready(ada) :- missing(ada).\n", query: "ready(ada)" }) : (assert.match(prompt, /Runtime evidence/), { program: "ready(ada).\n", query: "ready(ada)" }) });
    assert.equal(repaired.records[0].attempts.length, 2); assert.equal(repaired.records[0].attempts[0].observation.execution_outcome.startsWith("error:"), true); assert.equal(repaired.records[0].attempts[1].observation.execution_outcome, "succeeded");
    const reflected = await collect({ fixture, rawRoot: path.join(parent, "reflection-raw"), maxRepairAttempts: 1, forceRepairAfterInitial: true, generate: async ({ stage, prompt }) => stage === "initial" ? ({ program: "probe.\n", query: "meta_help(all, Documentation)" }) : (assert.match(prompt, /documentation\(finite_status\/6/), { program: "ready(ada).\n", query: "ready(ada)" }) });
    assert.equal(reflected.records[0].attempts.length, 2);
    assert.match(reflected.records[0].attempts[0].observation.runtime.transcript.transcript, /documentation\(finite_status\/6/);
    assert.equal(reflected.records[0].observation.execution_outcome, "succeeded");
    assert.equal(needsRepair({ execution_outcome: "failed", runtime: { transcript: { transcript: "" } } }, null), true);
    assert.equal(needsRepair({ execution_outcome: "succeeded", runtime: { transcript: { transcript: "ERROR: Syntax error: Operator expected" } } }, null), true);
    console.log("free-prolog-diagnostic-collector ok: raw ordinary Prolog observation remains non-scoring");
  } finally { fs.rmSync(parent, { recursive: true, force: true }); }
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
