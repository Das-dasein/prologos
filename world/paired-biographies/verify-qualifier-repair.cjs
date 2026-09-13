#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const H = require('./harness.cjs');
const { SYSTEM, prepare } = require('./qualifier-repair.cjs');

async function verify(directory) {
  const root = path.resolve(directory);
  const reportFile = path.join(root, 'report.json');
  const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
  assert.equal(report.version, 'paired-qualifier-repair-run-v1');
  assert.equal(report.status, 'completed');
  const { selected } = await prepare();
  assert.equal(report.records.length, selected.length);
  for (let index = 0; index < selected.length; index += 1) {
    const item = selected[index], record = report.records[index];
    assert.equal(record.case_id, item.c.case_id);
    assert.deepEqual(record.diagnostics, item.diagnostics);
    assert.deepEqual(record.source_score, item.sourceRecord.repair_score);
    const bytes = fs.readFileSync(path.join(root, record.evidence));
    assert.equal(H.sha(bytes), record.evidence_sha256);
    const evidence = JSON.parse(bytes);
    assert.equal(evidence.prompt.system, SYSTEM);
    assert.equal(evidence.prompt.user, item.request.user);
    assert.deepEqual(evidence.model_messages, [{ role: 'system', content: SYSTEM }, { role: 'user', content: item.request.user }]);
    assert.equal(evidence.status, 'ok');
    assert.equal(evidence.inference_calls, 1);
    assert.equal(evidence.physical_dispatches, 1);
    assert.equal(evidence.denied_physical_attempts, 0);
    assert.deepEqual(evidence.tools, []);
    assert.equal(evidence.wire_model, report.config.model);
    const score = H.scoreExtraction(item.c, evidence.final_response, evidence);
    assert.deepEqual(score, record.repair_score);
    assert.equal(score.exact, true);
    const allowed = new Set(item.diagnostics.map(value => `${value.candidate_id}:${value.field}`));
    for (let n = 0; n < score.candidates.length; n += 1) {
      const before = item.sourceRecord.repair_score.candidates[n], after = score.candidates[n];
      assert.equal(after.id, before.id);
      for (const key of Object.keys(before)) if (!allowed.has(`${before.id}:${key}`)) {
        assert.deepEqual(after[key], before[key], `${before.id}.${key} changed without diagnostic`);
      }
    }
  }
  assert.deepEqual(report.summary, { syntax_repair_combined_exact: 23, qualifier_repair_attempted: 1, qualifier_repair_exact: 1, final_assisted_exact: 24 });
  assert.ok(report.sources.length >= 11);
  for (const source of report.sources) {
    const bytes = fs.readFileSync(path.join(root, source.snapshot));
    assert.equal(H.sha(bytes), source.sha256, source.file);
  }
  return { status: 'verified', report: reportFile, records: report.records.length, summary: report.summary };
}

if (require.main === module) {
  if (process.argv.length !== 3) { console.error('usage: node world/paired-biographies/verify-qualifier-repair.cjs REPORT_DIR'); process.exit(2); }
  verify(process.argv[2]).then(value => console.log(JSON.stringify(value, null, 2))).catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
}
module.exports = { verify };
