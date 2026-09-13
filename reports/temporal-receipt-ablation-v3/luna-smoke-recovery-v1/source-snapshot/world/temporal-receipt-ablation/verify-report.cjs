#!/usr/bin/env node
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const H = require("../paired-biographies/harness.cjs");
const { score } = require("../temporal-relational-stress/collector.cjs");
const { CONDITIONS } = require("./generator.cjs");
const { SYSTEM, aggregate, loadFrozenFixture, makePlan } = require("./collector.cjs");

async function verify(directory) {
  const root = path.resolve(directory), reportFile = path.join(root, "report.json"), report = JSON.parse(fs.readFileSync(reportFile));
  assert.equal(report.schema_version, "temporal-receipt-ablation-run-v3");
  assert.equal(["completed", "completed_with_runtime_failures"].includes(report.status), true);
  assert.equal(report.model, report.config.model); assert.deepEqual(report.config.tools, []); assert.equal(report.config.retries, 0);
  const frozen = await loadFrozenFixture(); assert.equal(report.fixture.sha256, frozen.sha256);
  const cases = frozen.fixture.cases.filter(item => report.selected_cases.includes(item.case_id));
  assert.deepEqual(cases.map(item => item.case_id), report.selected_cases);
  assert.equal(report.selected_conditions.every(value => CONDITIONS.includes(value)), true);
  const plan = makePlan(cases, report.selected_conditions); assert.equal(report.records.length, plan.length);
  const replayed = [];
  for (let index = 0; index < plan.length; index += 1) {
    const expected = plan[index], record = report.records[index]; assert.equal(record.sequence, expected.sequence); assert.equal(record.case_id, expected.case.case_id); assert.equal(record.condition, expected.condition); assert.equal(record.order, expected.order);
    const evidenceBytes = fs.readFileSync(path.join(root, record.evidence)); assert.equal(H.sha(evidenceBytes), record.evidence_sha256);
    const evidence = JSON.parse(evidenceBytes); assert.deepEqual(evidence.prompt, { system: SYSTEM, user: expected.case.prompts[record.condition.toLowerCase()] }); assert.deepEqual(evidence.model_messages, [{ role: "system", content: SYSTEM }, { role: "user", content: expected.case.prompts[record.condition.toLowerCase()] }]);
    assert.equal(evidence.wire_model, report.model); if (record.score.runtime_valid) assert.equal(evidence.reported_response_model, report.model);
    const rescored = score(evidence, expected.case.oracle); assert.deepEqual(rescored, record.score); replayed.push({ ...record, score: rescored });
  }
  for (const source of report.sources) { const bytes = fs.readFileSync(path.join(root, source.snapshot)); assert.equal(H.sha(bytes), source.sha256, source.file); }
  const summary = aggregate(replayed, cases, report.selected_conditions); assert.deepEqual(summary, report.summary);
  assert.equal(report.status, replayed.every(row => row.score.runtime_valid) ? "completed" : "completed_with_runtime_failures");
  return { status: "verified-temporal-receipt-ablation-v3", report: reportFile, records: replayed.length, fixture_sha256: frozen.sha256, per_condition: summary.per_condition, paired: summary.paired };
}
if (require.main === module) { if (!process.argv[2] || process.argv.length !== 3) process.exit(2); verify(process.argv[2]).then(x => console.log(JSON.stringify(x, null, 2))).catch(e => { console.error(e.stack || e.message); process.exitCode = 1; }); }
module.exports = { verify };
