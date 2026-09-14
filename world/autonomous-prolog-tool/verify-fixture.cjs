#!/usr/bin/env node
"use strict";
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { generateFixture, stable, VERSION } = require("./generator.cjs");
const { seedWorld } = require("./collector.cjs");
const EXPECTED = "59a10bef62f64dad79eb2539a0e17248db7f6783a8eaa660839e8e3bc84c49fc";
async function verifyFixture(file) {
  const bytes = fs.readFileSync(path.resolve(file)), hash = crypto.createHash("sha256").update(bytes).digest("hex"); assert.equal(hash, EXPECTED); const fixture = JSON.parse(bytes); assert.equal(fixture.schema_version, VERSION); assert.equal(fixture.cases.length, 16); assert.equal(Buffer.compare(bytes, Buffer.from(stable(generateFixture()))), 0);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "apt4-fixture-"));
  try { for (const item of fixture.cases) { assert.equal(item.prompts.n, item.prompts.a, item.case_id); assert.equal(item.prompts.n.includes("world_memory_query"), false, item.case_id); assert.equal(item.prompts.g.includes("world_memory_query exactly once"), true, item.case_id); const seeded = await seedWorld(item, path.join(root, item.case_id)); assert.equal(fs.existsSync(path.join(seeded.directory, "events.jsonl")), true); } } finally { fs.rmSync(root, { recursive: true, force: true }); }
  return { status: "verified-autonomous-prolog-tool-v4", cases: fixture.cases.length, sha256: hash, bytes: bytes.length };
}
if (require.main === module) { if (!process.argv[2] || process.argv.length !== 3) process.exit(2); verifyFixture(process.argv[2]).then(x => console.log(JSON.stringify(x, null, 2))).catch(e => { console.error(e.stack || e.message); process.exitCode = 1; }); }
module.exports = { EXPECTED, verifyFixture };
