"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const H = require("../paired-biographies/harness.cjs");
const { CONDITIONS, collect, loadFrozenFixture, makePlan, options, parseAnswer, score } = require("./collector.cjs");
const { verify } = require("./verify-report.cjs");

const runtimeDescriptor = { runtime: { fingerprint: "fake-runtime" }, config: { model: "fake-model", retries: 0, tools: [] } };
const validRun = answer => ({ status: "ok", final_response: answer, inference_calls: 1, physical_dispatches: 1, denied_physical_attempts: 0, physical_attempts: [{ status: "completed" }], provider_terminal_status: "completed", tools: [], usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 } });
const answerFor = oracle => JSON.stringify({ status: oracle.status, positive_support_sets: oracle.positive_support_sets, negative_support_sets: oracle.negative_support_sets });

(async () => {
  const frozen = await loadFrozenFixture();
  assert.equal(frozen.fixture.cases.length, 32);
  const cases = [frozen.fixture.cases[0], frozen.fixture.cases.at(-1)], plan = makePlan(cases);
  assert.equal(plan.length, 8);
  assert.deepEqual(plan.slice(0, 4).map(entry => entry.condition), ["P0", "P1", "P1F", "P2"]);
  assert.deepEqual(plan.slice(4).map(entry => entry.condition), ["P1", "P1F", "P2", "P0"]);

  const oracle = cases[0].oracle, canonical = answerFor(oracle), parsed = parseAnswer(canonical);
  assert.equal(parsed.format_valid, true);
  assert.equal(score(validRun(canonical), oracle).exact, true);
  const malformed = `Answer: {"status":"${oracle.status}"}`;
  assert.equal(parseAnswer(malformed).status, oracle.status);
  assert.equal(score(validRun(malformed), oracle).status_correct, true);
  assert.equal(score(validRun(malformed), oracle).exact, false);
  const unsortedObject = JSON.parse(canonical);
  if (unsortedObject.positive_support_sets[0]) unsortedObject.positive_support_sets[0].reverse();
  else unsortedObject.negative_support_sets[0].reverse();
  const unsortedScore = score(validRun(JSON.stringify(unsortedObject)), oracle);
  assert.equal(unsortedScore.status_correct, true);
  assert.equal(unsortedScore.support_set_correct, true);
  assert.equal(unsortedScore.exact, false);
  assert.throws(() => options(["offline", "--conditions", "P0,P0"]), /unique/);
  assert.throws(() => options(["offline", "--conditions", "P3"]), /members/);

  const byPrompt = new Map();
  for (const item of cases) for (const condition of CONDITIONS) byPrompt.set(item.prompts[condition.toLowerCase()], item.oracle);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pam-temporal-relational-")), output = path.join(root, "full");
  let calls = 0;
  const invokeFn = async (request, directory) => {
    calls += 1; fs.mkdirSync(directory, { recursive: true });
    const selectedOracle = byPrompt.get(request.user); assert(selectedOracle);
    const run = { ...validRun(answerFor(selectedOracle)), prompt: { system: request.system, user: request.user }, model_messages: [{ role: "system", content: request.system }, { role: "user", content: request.user }], wire_model: "fake-model", reported_response_model: "fake-model" };
    const bytes = `${JSON.stringify(run, null, 2)}\n`; fs.writeFileSync(path.join(directory, "adapter.json"), bytes);
    return { ...run, evidence_sha256: H.sha(bytes) };
  };
  const report = await collect({ mode: "live", frozen, model: "fake-model", out: output, selectedCases: cases, invokeFn, runtimeDescriptor });
  assert.equal(calls, 8);
  assert.equal(report.status, "completed");
  for (const condition of CONDITIONS) { assert.equal(report.summary.per_condition[condition].status_correct, 2); assert.equal(report.summary.per_condition[condition].exact, 2); }
  assert.equal((await verify(output)).records, 8);
  fs.rmSync(root, { recursive: true, force: true });
  console.log("temporal relational collector ok: independent status scoring and verified 8-call fake plan");
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
