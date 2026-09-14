"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const H = require("../paired-biographies/harness.cjs");
const { CONDITIONS } = require("./generator.cjs");
const { SYSTEM, collect, loadFrozenFixture, makePlan, runtimeValid } = require("./collector.cjs");
const { verify } = require("./verify-report.cjs");
function fakeRun(item, condition) {
  const receipt = { status: "ok", query: item.formal_world.query, raw_status: item.oracle.status, raw_support_sets: [...item.oracle.positive_support_sets.map(item_ids => ({ literal: item.formal_world.query, item_ids })), ...item.oracle.negative_support_sets.map(item_ids => ({ literal: `neg(${item.formal_world.query})`, item_ids }))] }, raw = JSON.stringify(receipt);
  const compact = JSON.stringify({ receipt_schema: "target-support-v1", query: item.formal_world.query, status: item.oracle.status, positive_support_sets: item.oracle.positive_support_sets, negative_support_sets: item.oracle.negative_support_sets });
  const delivered = condition === "R" ? raw : compact, call = { name: "world_memory_query", args: { query: item.formal_world.query }, raw_result: raw, delivered_result: delivered, result: delivered };
  return { status: "ok", final_response: JSON.stringify({ status: item.oracle.status, positive_support_sets: item.oracle.positive_support_sets, negative_support_sets: item.oracle.negative_support_sets }), inference_calls: 2, physical_dispatches: 2, denied_physical_attempts: 0, physical_attempts: [{ status: "completed" }, { status: "completed" }], provider_terminal_status: "completed", tools: [{ type: "function", function: { name: "world_memory_query" } }], tool_calls: [call], usage: {} };
}
(async () => {
  const frozen = await loadFrozenFixture(), cases = [frozen.fixture.cases[0], frozen.fixture.cases[1]]; assert.deepEqual(makePlan(cases).map(x => x.condition), ["R", "C", "C", "R"]);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "prt6-collector-")), out = path.join(root, "run");
  const invokeFn = async (request, directory) => { const item = cases.find(candidate => candidate.prompts.r === request.user); assert(item); const run = { ...fakeRun(item, request.condition), condition: request.condition, receipt_mode: request.condition === "R" ? "raw" : "compact_target_v1", max_tool_calls: 1, prompt: { system: request.system, user: request.user }, model_messages_by_inference: [[{ role: "system", content: request.system }, { role: "user", content: request.user }]], wire_model: "fake", reported_response_model: "fake" }; const bytes = `${JSON.stringify(run, null, 2)}\n`; fs.writeFileSync(path.join(directory, "adapter.json"), bytes); return { ...run, evidence_sha256: H.sha(bytes) }; };
  const report = await collect({ mode: "live", frozen, model: "fake", out, selectedCases: cases, conditions: CONDITIONS, invokeFn, runtimeDescriptor: { runtime: { fingerprint: "fake" }, config: { model: "fake", retries: 0, fallback: null } } }); assert.equal(report.status, "completed"); assert.equal(report.records.length, 4); for (const condition of CONDITIONS) { assert.equal(report.summary.per_condition[condition].exact, 2); assert.equal(report.summary.per_condition[condition].raw_receipt_correct, 2); assert.equal(report.summary.per_condition[condition].delivered_receipt_correct, 2); } assert.equal((await verify(out)).records, 4);
  const raw = fakeRun(cases[0], "R"); assert.equal(runtimeValid(raw, "R"), true); assert.equal(runtimeValid({ ...raw, tool_calls: [] }, "R"), false); assert.equal(runtimeValid({ ...raw, physical_dispatches: 3 }, "R"), false);
  fs.rmSync(root, { recursive: true, force: true }); console.log("prolog receipt transport collector ok");
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
