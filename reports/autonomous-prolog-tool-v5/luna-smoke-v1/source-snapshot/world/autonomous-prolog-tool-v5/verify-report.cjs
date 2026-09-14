#!/usr/bin/env node
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const H = require("../paired-biographies/harness.cjs");
const { CONDITIONS } = require("./generator.cjs");
const { SYSTEM, aggregate, loadFrozenFixture, makePlan, score } = require("./collector.cjs");
async function verify(directory) {
  const root = path.resolve(directory), reportFile = path.join(root, "report.json"), report = JSON.parse(fs.readFileSync(reportFile)); assert.equal(report.schema_version, "autonomous-prolog-tool-run-v5"); assert.equal(["completed", "completed_with_runtime_failures"].includes(report.status), true); assert.equal(report.model, report.config.model); assert.equal(report.config.retries, 0); assert.equal(report.config.fallback, null);
  const frozen = await loadFrozenFixture(); assert.equal(report.fixture.sha256, frozen.sha256); const cases = frozen.fixture.cases.filter(x => report.selected_cases.includes(x.case_id)); assert.deepEqual(cases.map(x => x.case_id), report.selected_cases); assert.equal(report.selected_conditions.every(x => CONDITIONS.includes(x)), true); const plan = makePlan(cases, report.selected_conditions); assert.equal(report.records.length, plan.length); const replayed = [];
  for (let i = 0; i < plan.length; i += 1) { const expected = plan[i], record = report.records[i]; assert.equal(record.sequence, expected.sequence); assert.equal(record.case_id, expected.case.case_id); assert.equal(record.condition, expected.condition); assert.equal(record.order, expected.order); const evidenceBytes = fs.readFileSync(path.join(root, record.evidence)); assert.equal(H.sha(evidenceBytes), record.evidence_sha256); const evidence = JSON.parse(evidenceBytes); assert.equal(evidence.condition, record.condition); assert.equal(evidence.max_tool_calls, record.condition === "A" ? 2 : (record.condition === "G" ? 1 : 0)); assert.deepEqual(evidence.prompt, { system: SYSTEM, user: expected.case.prompts[record.condition.toLowerCase()] }); const first = evidence.model_messages_by_inference?.[0]; assert.deepEqual(first?.slice(0, 2), [{ role: "system", content: SYSTEM }, { role: "user", content: expected.case.prompts[record.condition.toLowerCase()] }]); assert.equal(evidence.wire_model, report.model); if (record.score.runtime_valid) assert.equal(evidence.reported_response_model, report.model); const rescored = score(evidence, expected.case, expected.condition); assert.deepEqual(rescored, record.score); replayed.push({ ...record, score: rescored }); }
  for (const source of report.sources) { const bytes = fs.readFileSync(path.join(root, source.snapshot)); assert.equal(H.sha(bytes), source.sha256, source.file); }
  const summary = aggregate(replayed, cases, report.selected_conditions); assert.deepEqual(summary, report.summary); assert.equal(report.status, replayed.every(x => x.score.runtime_valid) ? "completed" : "completed_with_runtime_failures"); return { status: "verified-autonomous-prolog-tool-v5", records: replayed.length, fixture_sha256: frozen.sha256, per_condition: summary.per_condition };
}
if (require.main === module) { if (!process.argv[2] || process.argv.length !== 3) process.exit(2); verify(process.argv[2]).then(x => console.log(JSON.stringify(x, null, 2))).catch(e => { console.error(e.stack || e.message); process.exitCode = 1; }); }
module.exports = { verify };
