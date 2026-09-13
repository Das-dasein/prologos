'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { aggregate, createFreshDirectory, loadFrozenFixture, makePlan, options, parseAnswer, score } = require('./collector.cjs');

const validRun = answer => ({ status: 'ok', final_response: answer, inference_calls: 1, physical_dispatches: 1, denied_physical_attempts: 0, physical_attempts: [{ status: 'completed' }], provider_terminal_status: 'completed', tools: [] });

test('frozen fixture hash, generator bytes and checker oracles agree', async () => {
  const frozen = await loadFrozenFixture();
  assert.equal(frozen.fixture.cases.length, 32);
});

test('answer scoring is exact and runtime gated', () => {
  assert.deepEqual(parseAnswer('RESULT: conflict'), { format_valid: true, answer: 'conflict' });
  assert.equal(score(validRun('RESULT: entailed'), 'entailed').correct, true);
  assert.equal(score(validRun('RESULT: entailed\nextra'), 'entailed').correct, false);
  assert.equal(score({ ...validRun('RESULT: entailed'), physical_dispatches: 2 }, 'entailed').correct, false);
  assert.equal(score(validRun('RESULT: unknown'), 'entailed').correct, false);
});

test('plan counterbalances condition order and aggregate retains missing calls', async () => {
  const cases = (await loadFrozenFixture()).fixture.cases.slice(0, 2);
  const plan = makePlan(cases);
  assert.deepEqual(plan.slice(0, 3).map(value => value.condition), ['P0', 'P1', 'P2']);
  assert.deepEqual(plan.slice(3, 6).map(value => value.condition), ['P2', 'P1', 'P0']);
  const run = validRun('RESULT: entailed');
  const records = [{ case_id: cases[0].case_id, condition: 'P0', score: score(run, cases[0].oracle.status) }];
  const summary = aggregate(records, cases, ['P0', 'P1', 'P2']);
  assert.equal(summary.per_condition.P0.denominator, 2);
  assert.equal(summary.per_condition.P0.attempted, 1);
  assert.equal(summary.per_condition.P1.not_run, 2);
});

test('mutated fixture and unsafe live options fail before dispatch', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'reasoning-collector-'));
  const file = path.join(directory, 'fixture.json');
  try {
    const bytes = fs.readFileSync(path.resolve(__dirname, '../../.cdr/waves/reasoning-stress-v1/fixture.json'), 'utf8');
    fs.writeFileSync(file, bytes.replace('rs-d3-chain-entailed-r1', 'changed'));
    await assert.rejects(loadFrozenFixture(file), /hash/);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
  assert.throws(() => options(['live', '--model', 'gpt-5.6-luna']), /requires explicit/);
  assert.throws(() => options(['live', '--model', 'gpt-5.6-luna', '--cases', 'all', '--out', '/tmp/x', '--conditions', 'P0,P0']), /unique/);
});

test('fresh evidence directory creates missing parents and refuses overwrite', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'reasoning-output-'));
  const out = path.join(root, 'missing-parent', 'run-v1');
  try {
    assert.equal(createFreshDirectory(out), out);
    assert.equal(fs.statSync(out).isDirectory(), true);
    assert.throws(() => createFreshDirectory(out), /EEXIST/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
