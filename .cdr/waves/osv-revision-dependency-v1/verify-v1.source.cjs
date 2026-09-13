#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sha256 } = require("../osv-advisory");
const { runFixture } = require("./runner.cjs");

function deterministicProjection(value) {
  if (Array.isArray(value)) return value.map(deterministicProjection);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => key !== "runtime_ms").map(([key, nested]) => [key, deterministicProjection(nested)]));
}

async function verify(fixturePath, receiptDirectory, reportPath) {
  const fixture = JSON.parse(fs.readFileSync(path.resolve(fixturePath), "utf8"));
  const report = JSON.parse(fs.readFileSync(path.resolve(reportPath), "utf8"));
  assert.equal(report.schema_version, "osv-revision-dependency-report-v1");
  assert.equal(report.fixture_sha256, sha256(Buffer.from(JSON.stringify(fixture))));
  const replay = await runFixture(fixture, path.resolve(receiptDirectory));
  assert.deepEqual(deterministicProjection(replay), deterministicProjection(report));
  const result = { status: "verified-osv-revision-dependency-report-v1", fixture_sha256: report.fixture_sha256, summary: report.summary };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return result;
}

if (require.main === module) {
  if (process.argv.length !== 5) throw new Error("usage: node verify.cjs fixture.json receipts report.json");
  verify(process.argv[2], process.argv[3], process.argv[4]).catch(error => { process.stderr.write(`${error.stack || error.message}\n`); process.exitCode = 1; });
}
module.exports = { deterministicProjection, verify };
