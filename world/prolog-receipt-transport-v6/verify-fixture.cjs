#!/usr/bin/env node
"use strict";
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { generateFixture, stable, VERSION } = require("./generator.cjs");
const { seedWorld } = require("./collector.cjs");
const EXPECTED = "d020aae0ec760411256beafcd9d15fbd9e9efdd50c878782ae9c2be29442c456";
async function verifyFixture(file) {
  const bytes = fs.readFileSync(path.resolve(file)), hash = crypto.createHash("sha256").update(bytes).digest("hex"); assert.equal(hash, EXPECTED); const fixture = JSON.parse(bytes); assert.equal(fixture.schema_version, VERSION); assert.equal(fixture.cases.length, 16); assert.equal(Buffer.compare(bytes, Buffer.from(stable(generateFixture()))), 0);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "prt6-fixture-"));
  try { for (const item of fixture.cases) { assert.equal(item.prompts.r, item.prompts.c, item.case_id); assert.equal(item.prompts.r.includes("world_memory_query exactly once"), true, item.case_id); const seeded = await seedWorld(item, path.join(root, item.case_id)); assert.equal(fs.existsSync(path.join(seeded.directory, "events.jsonl")), true); } } finally { fs.rmSync(root, { recursive: true, force: true }); }
  return { status: "verified-prolog-receipt-transport-v6", cases: fixture.cases.length, sha256: hash, bytes: bytes.length };
}
if (require.main === module) { if (!process.argv[2] || process.argv.length !== 3) process.exit(2); verifyFixture(process.argv[2]).then(x => console.log(JSON.stringify(x, null, 2))).catch(e => { console.error(e.stack || e.message); process.exitCode = 1; }); }
module.exports = { EXPECTED, verifyFixture };
