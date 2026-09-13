'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const H = require('./harness.cjs');
const { mentionsInteger, validateQualifiers } = require('./qualifier-validator.cjs');

const clone = value => JSON.parse(JSON.stringify(value));

test('integer mentions require complete numeric tokens', () => {
  assert.equal(mentionsInteger('from 5 to 50 inclusive', 50), true);
  assert.equal(mentionsInteger('from 5 to 50 inclusive', 5), true);
  assert.equal(mentionsInteger('from 5 to 50 inclusive', 0), false);
});

test('first-pass qualifier diagnostics isolate the unsupported p05_b endpoint', async () => {
  const dataset = await H.loadDataset();
  const report = require('../../reports/paired-biographies-v1/luna-full-review-v2/report.json');
  const found = [];
  for (const record of report.extraction) {
    const c = dataset.rows.find(value => value.case_id === record.case_id);
    const diagnostics = validateQualifiers(c, record.score.candidates);
    if (diagnostics.length) found.push({ case_id: record.case_id, diagnostics });
  }
  assert.deepEqual(found, [{ case_id: 'p05_b', diagnostics: [{ candidate_id: 'itema1', field: 'validTo', code: 'unsupported_end', message: 'validTo 19 is not stated in source m_old_rule. Do not infer an endpoint from a later replacement; the replaces link retires the old item.' }] }]);
});

test('explicit intervals pass and unsupported or broken qualifiers fail closed', async () => {
  const dataset = await H.loadDataset();
  const c = dataset.rows.find(value => value.case_id === 'p06_a');
  assert.deepEqual(validateQualifiers(c, clone(c.expected_extraction_candidates)), []);
  const unsupported = clone(c.expected_extraction_candidates); unsupported[0].validTo = 51;
  assert.equal(validateQualifiers(c, unsupported)[0].code, 'unsupported_end');
  const replacementCase = dataset.rows.find(value => value.case_id === 'p05_b');
  const broken = clone(replacementCase.expected_extraction_candidates); broken[2].replaces = 'missing';
  assert.ok(validateQualifiers(replacementCase, broken).some(value => value.code === 'unknown_replacement_target'));
});

