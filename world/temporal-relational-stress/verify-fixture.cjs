#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { check } = require("../checker");
const { generateFixture, querySupport, stable, VERSION } = require("./generator.cjs");

const EXPECTED_FIXTURE_SHA256 = "5548271441e7ef641f37b2032ffba0cc63e943ffe8332b15d16c85bec0538df4";
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");

async function verifyFixture(file) {
  const absolute = path.resolve(file), retained = fs.readFileSync(absolute), observedHash = sha256(retained);
  assert.equal(observedHash, EXPECTED_FIXTURE_SHA256, "fixture hash differs from frozen v2 input");
  const fixture = JSON.parse(retained);
  assert.equal(fixture.schema_version, VERSION);
  assert.equal(fixture.cases.length, 32);
  const regenerated = Buffer.from(stable(await generateFixture()));
  assert.equal(Buffer.compare(retained, regenerated), 0, "retained fixture differs from deterministic regeneration");
  for (const item of fixture.cases) {
    const result = await check({ snapshot: { ideas: item.formal_world.ideas, items: item.formal_world.active_items }, query: item.formal_world.query });
    assert.equal(result.status, "ok", item.case_id);
    assert.equal(result.raw_status, item.oracle.status, item.case_id);
    const supports = querySupport(result, item.formal_world.query);
    assert.deepEqual(supports.positive, item.oracle.positive_support_sets, item.case_id);
    assert.deepEqual(supports.negative, item.oracle.negative_support_sets, item.case_id);
    assert.equal(item.checker_receipt.snapshot_sha256, item.scorer_only.active_snapshot_sha256, item.case_id);
  }
  return { status: "verified", fixture: absolute, cases: fixture.cases.length, bytes: retained.length, sha256: observedHash };
}

if (require.main === module) {
  const file = process.argv[2];
  if (!file || process.argv.length !== 3) { console.error("usage: node world/temporal-relational-stress/verify-fixture.cjs FIXTURE.json"); process.exit(2); }
  verifyFixture(file).then(result => console.log(JSON.stringify(result, null, 2))).catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
}

module.exports = { EXPECTED_FIXTURE_SHA256, verifyFixture };
