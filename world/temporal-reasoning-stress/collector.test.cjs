"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const H = require("../paired-biographies/harness.cjs");
const { collect, loadFrozenFixture, makePlan, options, parseAnswer, score } = require("./collector.cjs");
const { verify } = require("./verify-report.cjs");

const runtimeDescriptor = { runtime: { fingerprint: "fake-runtime" }, config: { model: "fake-model", retries: 0, tools: [] } };
const validRun = answer => ({ status: "ok", final_response: answer, inference_calls: 1, physical_dispatches: 1, denied_physical_attempts: 0, physical_attempts: [{ status: "completed" }], provider_terminal_status: "completed", tools: [], usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 } });
const answerFor = oracle => `STATUS: ${oracle.status}\nSUPPORT: ${oracle.support_item_ids.length ? oracle.support_item_ids.join(",") : "none"}`;

(async () => {
  const frozen = await loadFrozenFixture();
  assert.equal(frozen.fixture.cases.length, 36);
  const cases = [frozen.fixture.cases[0], frozen.fixture.cases.at(-1)];
  const plan = makePlan(cases);
  assert.equal(plan.length, 6);
  assert.deepEqual(plan.slice(0, 3).map(entry => entry.condition), ["P0", "P1", "P2"]);
  assert.deepEqual(plan.slice(3).map(entry => entry.condition), ["P1", "P2", "P0"]);

  assert.deepEqual(parseAnswer("STATUS: unknown\nSUPPORT: none"), { format_valid: true, status: "unknown", support: "none" });
  assert.deepEqual(parseAnswer("STATUS: entailed\nSUPPORT: a, b"), { format_valid: true, status: "entailed", support: "a,b" });
  assert.equal(parseAnswer("STATUS: entailed\nSUPPORT: z,a").format_valid, false);
  assert.equal(parseAnswer("STATUS: entailed\nSUPPORT: none").format_valid, false);
  assert.equal(parseAnswer("STATUS: ENTAILED\nSUPPORT: a").format_valid, false);
  assert.equal(score(validRun(answerFor(cases[0].oracle)), cases[0].oracle).exact, true);
  assert.throws(() => options(["live", "--model", "gpt-5.6-luna"]), /require explicit/);
  assert.throws(() => options(["offline", "--conditions", "P0,P0"]), /unique/);

  const byPrompt = new Map();
  for (const item of cases) for (const condition of ["p0", "p1", "p2"]) byPrompt.set(item.prompts[condition], item.oracle);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pam-temporal-reasoning-"));
  const fullOut = path.join(root, "full");
  let calls = 0;
  const invokeFn = async (request, directory) => {
    calls += 1;
    fs.mkdirSync(directory, { recursive: true });
    const oracle = byPrompt.get(request.user);
    assert(oracle, "prompt must be one selected frozen condition");
    const run = { ...validRun(answerFor(oracle)), prompt: { system: request.system, user: request.user }, model_messages: [{ role: "system", content: request.system }, { role: "user", content: request.user }], wire_model: "fake-model", reported_response_model: "fake-model" };
    const bytes = `${JSON.stringify(run, null, 2)}\n`;
    fs.writeFileSync(path.join(directory, "adapter.json"), bytes);
    return { ...run, evidence_sha256: H.sha(bytes) };
  };
  const full = await collect({ mode: "live", frozen, model: "fake-model", out: fullOut, selectedCases: cases, invokeFn, runtimeDescriptor });
  assert.equal(calls, 6);
  assert.equal(full.status, "completed");
  for (const condition of ["P0", "P1", "P2"]) assert.equal(full.summary.per_condition[condition].exact, 2);
  assert.equal((await verify(fullOut)).records, 6);

  const interruptedOut = path.join(root, "interrupted");
  let interruptedCalls = 0;
  const interruptedInvoke = async (request, directory) => {
    interruptedCalls += 1;
    fs.mkdirSync(directory, { recursive: true });
    if (interruptedCalls === 1) fs.mkdirSync(path.join(interruptedOut, "calls", plan[1].case.case_id, plan[1].condition), { recursive: true });
    const run = validRun(answerFor(byPrompt.get(request.user)));
    const bytes = `${JSON.stringify(run, null, 2)}\n`;
    fs.writeFileSync(path.join(directory, "adapter.json"), bytes);
    return { ...run, evidence_sha256: H.sha(bytes) };
  };
  const interrupted = await collect({ mode: "live", frozen, model: "fake-model", out: interruptedOut, selectedCases: cases, invokeFn: interruptedInvoke, runtimeDescriptor });
  assert.equal(interruptedCalls, 5);
  assert.equal(interrupted.status, "completed_with_runtime_failures");
  assert.equal(interrupted.records.filter(record => record.status === "interrupted").length, 1);
  fs.rmSync(root, { recursive: true, force: true });

  console.log("temporal reasoning collector ok: strict 6-call fake plan and no-redispatch interruption handling");
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
