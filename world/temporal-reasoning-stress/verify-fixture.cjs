#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { generateFixture, stable, VERSION } = require("./generator.cjs");

const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");

async function verifyFixture(file) {
  const absolute = path.resolve(file);
  const retained = fs.readFileSync(absolute);
  const fixture = JSON.parse(retained);
  assert.equal(fixture.schema_version, VERSION);
  assert.equal(fixture.cases.length, 36);
  const regenerated = Buffer.from(stable(await generateFixture()));
  assert.equal(Buffer.compare(retained, regenerated), 0, "retained fixture differs from deterministic regeneration");
  return Object.freeze({ status: "verified", fixture: absolute, cases: fixture.cases.length, bytes: retained.length, sha256: sha256(retained) });
}

if (require.main === module) {
  const file = process.argv[2];
  if (!file || process.argv.length !== 3) { console.error("usage: node world/temporal-reasoning-stress/verify-fixture.cjs FIXTURE.json"); process.exit(2); }
  verifyFixture(file).then(result => console.log(JSON.stringify(result, null, 2))).catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
}

module.exports = { verifyFixture };
