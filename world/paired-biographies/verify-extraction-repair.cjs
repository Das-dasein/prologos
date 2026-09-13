#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const H = require('./harness.cjs');
const { SOURCE_REPORT, SYSTEM, buildRepair, sourceReport, summarize } = require('./extraction-repair.cjs');

async function verify(directory) {
  const root = path.resolve(directory), reportFile = path.join(root, 'report.json');
  const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
  assert.equal(report.version, 'paired-extraction-repair-run-v2');
  assert.equal(report.status, 'completed');
  const source = sourceReport().report, dataset = await H.loadDataset();
  const failed = source.extraction.filter(value => !value.score.exact);
  assert.equal(report.records.length, failed.length);
  const rescored = [];
  for (let index = 0; index < failed.length; index += 1) {
    const initial = failed[index], record = report.records[index];
    assert.equal(record.case_id, initial.case_id);
    assert.deepEqual(record.initial_score, initial.score);
    const c = dataset.rows.find(value => value.case_id === record.case_id);
    const initialEvidence = JSON.parse(fs.readFileSync(path.join(path.dirname(SOURCE_REPORT), initial.evidence), 'utf8'));
    const request = buildRepair(c, initial, initialEvidence);
    const evidenceBytes = fs.readFileSync(path.join(root, record.evidence));
    assert.equal(H.sha(evidenceBytes), record.evidence_sha256);
    const evidence = JSON.parse(evidenceBytes);
    assert.equal(evidence.prompt.system, SYSTEM);
    assert.equal(evidence.prompt.user, request.user);
    assert.deepEqual(evidence.model_messages, [{ role: 'system', content: SYSTEM }, { role: 'user', content: request.user }]);
    assert.equal(evidence.status, 'ok');
    assert.equal(evidence.inference_calls, 1);
    assert.equal(evidence.physical_dispatches, 1);
    assert.equal(evidence.denied_physical_attempts, 0);
    assert.deepEqual(evidence.tools, []);
    assert.equal(evidence.wire_model, report.config.model);
    const score = H.scoreExtraction(c, evidence.final_response, evidence);
    assert.deepEqual(score, record.repair_score);
    assert.equal(score.candidates.length, initial.score.candidates.length);
    for (let n = 0; n < score.candidates.length; n += 1) {
      const { program: beforeProgram, ...before } = initial.score.candidates[n];
      const { program: afterProgram, ...after } = score.candidates[n];
      assert.deepEqual(after, before, `${record.case_id}/${n}: non-program field changed`);
      if (initial.score.program_validations[n].status === 'valid') assert.equal(afterProgram, beforeProgram, `${record.case_id}/${n}: valid program changed`);
    }
    rescored.push({ ...record, repair_score: score });
  }
  const summary = summarize(rescored);
  assert.deepEqual(summary, report.summary);
  assert.ok(Array.isArray(report.sources) && report.sources.length >= 10);
  for (const sourceFile of report.sources) {
    const bytes = fs.readFileSync(path.join(root, sourceFile.snapshot));
    assert.equal(H.sha(bytes), sourceFile.sha256, `${sourceFile.file}: source snapshot hash`);
  }
  const tokens = report.records.reduce((sum, value) => ({ input: sum.input + (value.usage?.input_tokens || 0), output: sum.output + (value.usage?.output_tokens || 0) }), { input: 0, output: 0 });
  return { status: 'verified', report: reportFile, records: report.records.length, summary, tokens };
}

if (require.main === module) {
  if (process.argv.length !== 3) { console.error('usage: node world/paired-biographies/verify-extraction-repair.cjs REPORT_DIR'); process.exit(2); }
  verify(process.argv[2]).then(value => console.log(JSON.stringify(value, null, 2))).catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
}
module.exports = { verify };
