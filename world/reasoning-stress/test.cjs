'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { check } = require('../checker');
const { ANSWER, DEPTHS, REPLICAS, STATUSES, TOPOLOGIES, generateFixture, sha256, stable, writeFixture } = require('./generator.cjs');

let fixture;
test.before(async () => { fixture = await generateFixture(); });

test('fixture is deterministic and covers every declared stratum once', async () => {
  assert.equal(fixture.cases.length, DEPTHS.length * TOPOLOGIES.length * STATUSES.length * REPLICAS.length);
  assert.equal(stable(fixture), stable(await generateFixture()));
  const strata = new Set(fixture.cases.map(item => Object.values(item.stratum).join(':')));
  assert.equal(strata.size, fixture.cases.length);
});

test('fixture writer is exclusive and reports the hash of exact bytes', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'reasoning-stress-'));
  const file = path.join(directory, 'fixture.json');
  try {
    const written = writeFixture(file, fixture);
    const bytes = fs.readFileSync(file, 'utf8');
    assert.equal(bytes, stable(fixture));
    assert.equal(written.sha256, sha256(bytes));
    assert.throws(() => writeFixture(file, fixture), /EEXIST/);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('our signed-Horn checker independently reproduces all four labels', async () => {
  for (const item of fixture.cases) {
    const result = await check({ snapshot: { ideas: item.formal_world.ideas, items: item.formal_world.items }, query: item.formal_world.query });
    assert.equal(result.status, 'ok', item.case_id);
    assert.equal(result.raw_status, item.oracle.status, item.case_id);
  }
  const counts = Object.fromEntries(STATUSES.map(status => [status, fixture.cases.filter(item => item.oracle.status === status).length]));
  assert.deepEqual(counts, { entailed: 8, contradicted: 8, unknown: 8, conflict: 8 });
});

test('P0 and P1 differ only in representation; P2 adds a bound checker receipt', () => {
  for (const item of fixture.cases) {
    const p0 = item.prompts.p0.replace(item.renderings.natural, '<WORLD>');
    const p1 = item.prompts.p1.replace(item.renderings.formal, '<WORLD>');
    assert.equal(p0, p1, item.case_id);
    assert.ok(item.prompts.p0.endsWith(ANSWER));
    assert.ok(item.prompts.p2.startsWith(item.prompts.p1));
    assert.match(item.checker_receipt.receipt_id, /^[a-f0-9]{64}$/);
    assert.equal(item.checker_receipt.query, item.formal_world.query);
    assert.equal(item.checker_receipt.raw_status, item.oracle.status);
    assert.match(item.checker_receipt.checker_evidence_sha256, /^[a-f0-9]{64}$/);
    assert.equal(item.checker_receipt.query_support_item_ids.length > 0, ['entailed', 'conflict'].includes(item.oracle.status));
    assert.equal(item.checker_receipt.opposite_support_item_ids.length > 0, ['contradicted', 'conflict'].includes(item.oracle.status));
    for (const prompt of Object.values(item.prompts)) {
      assert.ok(!prompt.includes(item.case_id));
      assert.doesNotMatch(prompt, /\b(?:oracle|expected_status|gold_label)\b/i);
    }
  }
});

test('join unknowns contain a same-variable binding trap instead of a missing rule', () => {
  for (const item of fixture.cases.filter(value => value.stratum.topology === 'join' && value.stratum.status === 'unknown')) {
    const subject = item.formal_world.query.match(/\(([^)]+)\)/)[1];
    const programs = item.formal_world.items.map(value => value.program);
    assert.ok(programs.some(value => /_stage_6\(X\) :- .*\(X\), .*_gate_6\(X\)\./.test(value) || /_stage_3\(X\) :- .*\(X\), .*_gate_3\(X\)\./.test(value)));
    assert.ok(!programs.includes(`positive_gate_${item.stratum.depth}(${subject}).`));
    assert.ok(!programs.includes(`negative_gate_${item.stratum.depth}(${subject}).`));
  }
});
