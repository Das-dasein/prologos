"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const H = require("../paired-biographies/harness.cjs");
const { collect, loadFrozenFixture, makePlan, parseAnswer, score } = require("./collector.cjs");
const { verify } = require("./verify-report.cjs");

const runtimeDescriptor = { runtime: { fingerprint: "fake-runtime" }, config: { model: "fake-model", retries: 0, tools: [] } };
const validRun = answer => ({ status: "ok", final_response: answer, inference_calls: 1, physical_dispatches: 1, denied_physical_attempts: 0, physical_attempts: [{ status: "completed" }], provider_terminal_status: "completed", tools: [], usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 } });

(async () => {
  const frozen = await loadFrozenFixture();
  const plan = makePlan(frozen.fixture.cases);
  assert.equal(plan.length, 72);
  for (const order of ["P0→P1→P2", "P1→P2→P0", "P2→P0→P1"]) assert.equal(plan.filter(entry => entry.order === order).length, 24);
  for (const condition of ["P0", "P1", "P2"]) assert.equal(plan.filter(entry => entry.condition === condition).length, 24);

  assert.deepEqual(parseAnswer("DECISION: act\nSUPPORT: event_a|event_b"), { format_valid: true, decision: "act", support: "event_a|event_b" });
  assert.deepEqual(parseAnswer("DECISION: ask\nSUPPORT: none\n"), { format_valid: true, decision: "ask", support: "none" });
  for (const invalid of ["DECISION: act\nSUPPORT: none", "DECISION: pause\nSUPPORT: a|b", "DECISION: ACT\nSUPPORT: none", "DECISION: ask\nSUPPORT: none\nextra", "DECISION: act\nSUPPORT: z|a"]) assert.equal(parseAnswer(invalid).format_valid, false, invalid);
  assert.equal(score(validRun("DECISION: ask\nSUPPORT: none"), { decision: "ask", support: "none" }).exact, true);

  const byPrompt = new Map();
  for (const item of frozen.fixture.cases) for (const condition of ["p0", "p1", "p2"]) byPrompt.set(item.prompts[condition], item.oracle);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pam-provenance-decision-"));
  const fullOut = path.join(root, "full");
  let calls = 0;
  const invokeFn = async (request, directory) => {
    calls += 1;
    fs.mkdirSync(directory, { recursive: true });
    const oracle = byPrompt.get(request.user);
    assert(oracle, "prompt must be one frozen condition");
    const run = { ...validRun(`DECISION: ${oracle.decision}\nSUPPORT: ${oracle.support}`), prompt: { system: request.system, user: request.user }, model_messages: [{ role: "system", content: request.system }, { role: "user", content: request.user }], wire_model: "fake-model", reported_response_model: "fake-model" };
    const bytes = `${JSON.stringify(run, null, 2)}\n`;
    fs.writeFileSync(path.join(directory, "adapter.json"), bytes);
    return { ...run, evidence_sha256: H.sha(bytes) };
  };
  const full = await collect({ mode: "live", frozen, model: "fake-model", out: fullOut, invokeFn, runtimeDescriptor });
  assert.equal(calls, 72);
  assert.equal(full.status, "completed");
  for (const condition of ["P0", "P1", "P2"]) assert.equal(full.summary.per_condition[condition].exact, 24);
  assert.equal((await verify(fullOut)).records, 72);

  const interruptedOut = path.join(root, "interrupted");
  let interruptedCalls = 0;
  const interruptedInvoke = async (request, directory) => {
    interruptedCalls += 1;
    fs.mkdirSync(directory, { recursive: true });
    if (interruptedCalls === 1) fs.mkdirSync(path.join(interruptedOut, "calls", plan[1].case.case_id, plan[1].condition), { recursive: true });
    const oracle = byPrompt.get(request.user);
    const run = validRun(`DECISION: ${oracle.decision}\nSUPPORT: ${oracle.support}`);
    const bytes = `${JSON.stringify(run, null, 2)}\n`;
    fs.writeFileSync(path.join(directory, "adapter.json"), bytes);
    return { ...run, evidence_sha256: H.sha(bytes) };
  };
  const interrupted = await collect({ mode: "live", frozen, model: "fake-model", out: interruptedOut, invokeFn: interruptedInvoke, runtimeDescriptor });
  assert.equal(interruptedCalls, 71, "an existing uncommitted attempt directory must never be redispatched");
  assert.equal(interrupted.status, "completed_with_runtime_failures");
  assert.equal(interrupted.records.filter(record => record.status === "interrupted").length, 1);

  console.log("provenance decision collector ok: 72-call fake plan, strict scoring, and no-redispatch interruption handling");
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
