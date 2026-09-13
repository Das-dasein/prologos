'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const H = require('./harness.cjs');
const { SOURCE_REPORT, SYSTEM, buildRepair, sourceReport, summarize } = require('./extraction-repair.cjs');

test('frozen first-pass report exposes exactly eight repair candidates', async () => {
  const source = sourceReport().report, dataset = await H.loadDataset();
  const failed = source.extraction.filter(value => !value.score.exact);
  assert.equal(failed.length, 8);
  for (const record of failed) {
    const c = dataset.rows.find(value => value.case_id === record.case_id);
    const evidence = JSON.parse(fs.readFileSync(path.join(path.dirname(SOURCE_REPORT), record.evidence), 'utf8'));
    const request = buildRepair(c, record, evidence), text = JSON.stringify(request);
    assert.equal(request.system, SYSTEM);
    assert.deepEqual(request.payload.original_candidates, record.score.candidates);
    assert.ok(request.payload.deterministic_program_validation.some(value => value.status !== 'valid'));
    for (const forbidden of ['expected_extraction_candidates', 'expected_admission', 'admission_reason', 'oracle_rationale', 'required_proof_items']) assert.ok(!text.includes(forbidden));
  }
});

test('repair summary preserves all first-pass failures in its denominator', () => {
  const records = [
    { status: 'ok', initial_score: { invalid_predicted: 2 }, repair_score: { exact: true, invalid_predicted: 0 } },
    { status: 'failed', initial_score: { invalid_predicted: 1 }, repair_score: { exact: false, invalid_predicted: 1 } },
  ];
  assert.deepEqual(summarize(records, 24), { source_exact: 22, source_total: 24, repair_attempted: 2, repair_exact: 1, combined_exact: 23, invalid_programs_before: 3, invalid_programs_after: 1, runtime_failures: 1 });
});
