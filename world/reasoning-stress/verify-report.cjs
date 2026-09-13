#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const H = require('../paired-biographies/harness.cjs');
const { CONDITIONS, SYSTEM, aggregate, loadFrozenFixture, makePlan, score } = require('./collector.cjs');

async function verify(reportDirectory) {
  const root = path.resolve(reportDirectory);
  const reportFile = path.join(root, 'report.json');
  const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
  assert.equal(report.version, 'reasoning-stress-run-v1');
  assert.equal(report.status, 'completed');
  assert.deepEqual(report.selected_conditions, CONDITIONS);
  assert.equal(report.records.length, report.selected_cases.length * CONDITIONS.length);

  const frozen = await loadFrozenFixture();
  assert.equal(report.fixture.sha256, frozen.sha256);
  const selected = frozen.fixture.cases.filter(item => report.selected_cases.includes(item.case_id));
  assert.equal(selected.length, report.selected_cases.length);
  assert.deepEqual(selected.map(item => item.case_id), report.selected_cases);
  const expectedPlan = makePlan(selected, report.selected_conditions);
  const records = [];

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
    assert.deepEqual(evidence.model_messages, [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: expected.case.prompts[record.condition.toLowerCase()] },
    ]);
    assert.equal(evidence.wire_model, report.model);
    assert.equal(evidence.reported_response_model, report.model);
    const rescored = score(evidence, expected.case.oracle.status);
    assert.deepEqual(rescored, record.score, `${record.case_id}/${record.condition}: score replay`);
    assert.equal(record.status, evidence.status);
    records.push({ ...record, score: rescored });
  }

  for (const source of report.sources) {
    const bytes = fs.readFileSync(path.join(root, source.snapshot));
    assert.equal(H.sha(bytes), source.sha256, `${source.file}: source snapshot hash`);
  }
  const recomputed = aggregate(records, selected, report.selected_conditions);
  assert.deepEqual(recomputed, report.summary);
  const token_totals = Object.fromEntries(CONDITIONS.map(condition => {
    const rows = report.records.filter(item => item.condition === condition);
    return [condition, {
      input_tokens: rows.reduce((sum, item) => sum + (item.usage?.input_tokens || 0), 0),
      output_tokens: rows.reduce((sum, item) => sum + (item.usage?.output_tokens || 0), 0),
    }];
  }));
  const paired = {};
  for (const [left, right] of [['P0', 'P1'], ['P1', 'P2']]) {
    const cells = { both_correct: 0, left_only: 0, right_only: 0, both_wrong: 0 };
    for (const item of selected) {
      const l = records.find(value => value.case_id === item.case_id && value.condition === left).score.correct;
      const r = records.find(value => value.case_id === item.case_id && value.condition === right).score.correct;
      cells[l && r ? 'both_correct' : l ? 'left_only' : r ? 'right_only' : 'both_wrong'] += 1;
    }
    paired[`${left}_vs_${right}`] = cells;
  }
  return Object.freeze({ status: 'verified', report: reportFile, fixture_sha256: frozen.sha256, records: records.length, per_condition: recomputed.per_condition, paired, token_totals });
}

if (require.main === module) {
  const directory = process.argv[2];
  if (!directory || process.argv.length !== 3) { console.error('usage: node world/reasoning-stress/verify-report.cjs REPORT_DIRECTORY'); process.exit(2); }
  verify(directory).then(result => console.log(JSON.stringify(result, null, 2))).catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
}

module.exports = { verify };
