"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const H = require("../paired-biographies/harness.cjs");
const { CONDITIONS } = require("./generator.cjs");
const { SYSTEM, collect, loadFrozenFixture, makePlan } = require("./collector.cjs");
const { verify } = require("./verify-report.cjs");
function fakeRun(item, condition) {
  const enabled = condition !== "N", receipt = { query: item.formal_world.query, raw_status: item.oracle.status, raw_support_sets: [...item.oracle.positive_support_sets.map(item_ids => ({ literal: item.formal_world.query, item_ids })), ...item.oracle.negative_support_sets.map(item_ids => ({ literal: `neg(${item.formal_world.query})`, item_ids }))] };
  return { status: "ok", final_response: JSON.stringify({ status: item.oracle.status, positive_support_sets: item.oracle.positive_support_sets, negative_support_sets: item.oracle.negative_support_sets }), inference_calls: enabled ? 2 : 1, physical_dispatches: enabled ? 2 : 1, denied_physical_attempts: 0, physical_attempts: Array.from({ length: enabled ? 2 : 1 }, () => ({ status: "completed" })), provider_terminal_status: "completed", tools: enabled ? [{ type: "function", function: { name: "world_memory_query" } }] : [], tool_calls: enabled ? [{ name: "world_memory_query", args: { query: item.formal_world.query }, result: JSON.stringify(receipt) }] : [], usage: {} };
}
(async () => {
  const frozen = await loadFrozenFixture(), cases = [frozen.fixture.cases[0], frozen.fixture.cases[1]]; assert.deepEqual(makePlan(cases).map(x => x.condition), ["N", "A", "G", "A", "G", "N"]);
  const byPrompt = new Map(cases.flatMap(item => CONDITIONS.map(condition => [`${item.prompts[condition.toLowerCase()]}:${condition !== "N"}`, { item, condition }])));
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "apt4-collector-")), out = path.join(root, "run");
  const invokeFn = async (request, directory) => { const selected = byPrompt.get(`${request.user}:${request.tool_enabled}`); assert(selected); const run = { ...fakeRun(selected.item, selected.condition), prompt: { system: request.system, user: request.user }, model_messages_by_inference: [[{ role: "system", content: request.system }, { role: "user", content: request.user }]], wire_model: "fake", reported_response_model: "fake" }; const bytes = `${JSON.stringify(run, null, 2)}\n`; fs.writeFileSync(path.join(directory, "adapter.json"), bytes); return { ...run, evidence_sha256: H.sha(bytes) }; };
  const report = await collect({ mode: "live", frozen, model: "fake", out, selectedCases: cases, conditions: CONDITIONS, invokeFn, runtimeDescriptor: { runtime: { fingerprint: "fake" }, config: { model: "fake", retries: 0, fallback: null } } }); assert.equal(report.status, "completed"); assert.equal(report.records.length, 6); for (const condition of CONDITIONS) assert.equal(report.summary.per_condition[condition].exact, 2); assert.equal(report.summary.per_condition.N.tool_called, 0); assert.equal(report.summary.per_condition.A.receipt_correct, 2); assert.equal((await verify(out)).records, 6); fs.rmSync(root, { recursive: true, force: true }); console.log("autonomous prolog tool collector ok");
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
