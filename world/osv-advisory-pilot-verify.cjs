#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { prepareBundle, sha256 } = require("./osv-advisory");
const { runDecision } = require("./osv-advisory-pilot.cjs");

async function verify(reportPath) {
  const absolute = path.resolve(reportPath), report = JSON.parse(fs.readFileSync(absolute, "utf8"));
  assert.equal(report.schema_version, "osv-advisory-conflict-pilot-v1");
  assert.equal(report.experiment_kind, "external_metadata_engineering_pilot");
  assert.equal(report.api_base, "https://api.osv.dev/v1/vulns/");
  assert.ok(Array.isArray(report.receipt_files) && report.receipt_files.length >= 2 && report.receipt_files.length <= 8);
  const reportDirectory = path.dirname(absolute), receiptRoot = path.resolve(reportDirectory, "receipts");
  const receiptPaths = report.receipt_files.map(file => {
    assert.equal(typeof file, "string");
    const resolved = path.resolve(reportDirectory, file);
    assert.ok(resolved.startsWith(`${receiptRoot}${path.sep}`), "receipt must stay inside the report receipts directory");
    return resolved;
  });
  const raws = receiptPaths.map((file, index) => {
    const raw = fs.readFileSync(file), digest = sha256(raw);
    assert.equal(path.basename(file), `${digest}.json`, `receipt ${index} filename must match its content hash`);
    return raw;
  });
  const replay = prepareBundle(raws, report.target);
  assert.deepEqual(replay, report.records);
  for (const descriptor of replay) assert.equal(raws.some(raw => sha256(raw) === descriptor.source_group_attestation.external_receipt_sha256), true);
  const decision = await runDecision(replay, report.target);
  assert.deepEqual(decision, report.decision);
  assert.equal(decision.exact, true);
  const result = { status: "verified-osv-advisory-conflict-pilot-v1", records: replay.length, vulnerability_families: new Set(replay.map(value => value.vulnerability_id)).size, decision: decision.actual };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return result;
}

if (require.main === module) {
  if (process.argv.length !== 3) throw new Error("usage: node world/osv-advisory-pilot-verify.cjs REPORT.json");
  verify(process.argv[2]).catch(error => { process.stderr.write(`${error.stack || error.message}\n`); process.exitCode = 1; });
}
module.exports = { verify };
