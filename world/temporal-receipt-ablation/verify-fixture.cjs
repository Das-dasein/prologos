#!/usr/bin/env node
"use strict";
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { check } = require("../checker");
const { CONDITIONS, VERSION, generateFixture, stable } = require("./generator.cjs");
const EXPECTED_FIXTURE_SHA256 = "1dea093ca496d8d9fc4fb03a0e2534e65ff558c94e25843bdb9e8b1e4f7cb74f";
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
async function verifyFixture(file) {
  const absolute = path.resolve(file), retained = fs.readFileSync(absolute), hash = sha256(retained);
  assert.equal(hash, EXPECTED_FIXTURE_SHA256, "fixture hash differs from frozen v3 input");
  const fixture = JSON.parse(retained); assert.equal(fixture.schema_version, VERSION); assert.equal(fixture.cases.length, 32);
  assert.equal(Buffer.compare(retained, Buffer.from(stable(await generateFixture()))), 0, "fixture differs from deterministic regeneration");
  for (const item of fixture.cases) {
    const result = await check({ snapshot: { ideas: item.formal_world.ideas, items: item.formal_world.active_items }, query: item.formal_world.query });
    assert.equal(result.status, "ok", item.case_id); assert.equal(result.raw_status, item.oracle.status, item.case_id);
    assert.deepEqual(Object.keys(item.prompts).sort(), CONDITIONS.map(x => x.toLowerCase()).sort());
    assert.equal(item.prompts.l.includes("TRUSTED"), false, item.case_id);
    assert.equal(item.prompts.v.slice(item.prompts.v.indexOf("RECEIPT")).includes("positive_support_sets"), false, item.case_id);
    assert.equal(item.prompts.s.includes('"status"'), false, item.case_id);
    assert.equal(item.prompts.f.includes('"status"'), true, item.case_id);
  }
  return { status: "verified", fixture: absolute, cases: fixture.cases.length, bytes: retained.length, sha256: hash };
}
if (require.main === module) { const file = process.argv[2]; if (!file || process.argv.length !== 3) process.exitCode = 2; else verifyFixture(file).then(x => console.log(JSON.stringify(x, null, 2))).catch(e => { console.error(e.stack || e.message); process.exitCode = 1; }); }
module.exports = { EXPECTED_FIXTURE_SHA256, verifyFixture };
