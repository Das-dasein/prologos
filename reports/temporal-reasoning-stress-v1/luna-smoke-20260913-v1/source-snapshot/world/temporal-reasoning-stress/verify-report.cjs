#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const H = require("../paired-biographies/harness.cjs");
const { CONDITIONS, SYSTEM, aggregate, loadFrozenFixture, makePlan, score } = require("./collector.cjs");

async function verify(reportDirectory) {
  const root = path.resolve(reportDirectory);
  const reportFile = path.join(root, "report.json");
  const report = JSON.parse(fs.readFileSync(reportFile, "utf8"));
  assert.equal(report.schema_version, "temporal-reasoning-stress-run-v1");
  assert.equal(report.status, "completed");
  assert.equal(report.model, report.config.model);
  assert.deepEqual(report.config.tools, []);
  assert.equal(report.config.retries, 0);

  const frozen = await loadFrozenFixture();
  assert.equal(report.fixture.sha256, frozen.sha256);
  const cases = frozen.fixture.cases.filter(item => report.selected_cases.includes(item.case_id));
  assert.equal(cases.length, report.selected_cases.length);
  assert.deepEqual(cases.map(item => item.case_id), report.selected_cases);
  assert.equal(new Set(report.selected_conditions).size, report.selected_conditions.length);
  assert.equal(report.selected_conditions.every(condition => CONDITIONS.includes(condition)), true);
  const expectedPlan = makePlan(cases, report.selected_conditions);
  assert.equal(report.records.length, expectedPlan.length);
  const keys = new Set(report.records.map(record => `${record.case_id}:${record.condition}`));
  assert.equal(keys.size, expectedPlan.length);
  const replayed = [];

  for (let index = 0; index < expectedPlan.length; index += 1) {
    const expected = expectedPlan[index], record = report.records[index];
    assert.equal(record.sequence, expected.sequence);
    assert.equal(record.case_id, expected.case.case_id);
    assert.equal(record.condition, expected.condition);
    assert.equal(record.order, expected.order);
    assert.deepEqual(record.stratum, expected.case.stratum);
    const evidenceFile = path.join(root, record.evidence);
    const evidenceBytes = fs.readFileSync(evidenceFile);
    assert.equal(H.sha(evidenceBytes), record.evidence_sha256, `${record.case_id}/${record.condition}: evidence hash`);
    const evidence = JSON.parse(evidenceBytes);
    assert.equal(evidence.prompt.system, SYSTEM);
    assert.equal(evidence.prompt.user, expected.case.prompts[record.condition.toLowerCase()]);
    assert.deepEqual(evidence.model_messages, [{ role: "system", content: SYSTEM }, { role: "user", content: expected.case.prompts[record.condition.toLowerCase()] }]);
    assert.equal(evidence.wire_model, report.model);
    assert.equal(evidence.reported_response_model, report.model);
    const rescored = score(evidence, expected.case.oracle);
    assert.deepEqual(rescored, record.score, `${record.case_id}/${record.condition}: score replay`);
    assert.equal(record.status, evidence.status);
    assert.deepEqual(record.usage, evidence.usage);
    replayed.push({ ...record, score: rescored });
  }

  for (const source of report.sources) {
    const bytes = fs.readFileSync(path.join(root, source.snapshot));
    assert.equal(H.sha(bytes), source.sha256, `${source.file}: source snapshot hash`);
  }
  const summary = aggregate(replayed, cases, report.selected_conditions);
  assert.deepEqual(summary, report.summary);
  const paired_cells = {};
  for (const [left, right] of [["P0", "P1"], ["P1", "P2"]].filter(pair => pair.every(condition => report.selected_conditions.includes(condition)))) {
    const cells = { both_exact: 0, left_only: 0, right_only: 0, both_wrong: 0 };
    for (const item of cases) {
      const l = replayed.find(record => record.case_id === item.case_id && record.condition === left).score.exact;
      const r = replayed.find(record => record.case_id === item.case_id && record.condition === right).score.exact;
      cells[l && r ? "both_exact" : l ? "left_only" : r ? "right_only" : "both_wrong"] += 1;
    }
    paired_cells[`${left}_vs_${right}`] = cells;
  }
  return Object.freeze({ status: "verified-temporal-reasoning-stress-v1", report: reportFile, fixture_sha256: frozen.sha256, records: replayed.length, per_condition: summary.per_condition, paired_cells });
}

if (require.main === module) {
  if (!process.argv[2] || process.argv.length !== 3) { console.error("usage: node world/temporal-reasoning-stress/verify-report.cjs REPORT_DIRECTORY"); process.exit(2); }
  verify(process.argv[2]).then(result => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)).catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
}

module.exports = { verify };
