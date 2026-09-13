"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { runFixture, sha256 } = require("./run.cjs");

function verify(fixturePath, reportPath) {
  const fixtureBytes = fs.readFileSync(fixturePath);
  const fixture = JSON.parse(fixtureBytes);
  const report = JSON.parse(fs.readFileSync(reportPath));
  const frozenImplementationPath = path.join(path.dirname(fixturePath), "provenance-policy.source.js");
  assert.equal(fs.existsSync(frozenImplementationPath), true, "frozen policy source is missing");
  assert.equal(report.schema_version, "provenance-policy-ablation-report-v1");
  assert.equal(report.fixture_sha256, sha256(fixtureBytes));
  assert.equal(report.policy_implementation_sha256, sha256(fs.readFileSync(frozenImplementationPath)));
  const replay = runFixture(fixture, {
    fixture_sha256: report.fixture_sha256,
    policy_implementation_sha256: report.policy_implementation_sha256,
  });
  assert.deepEqual(report, replay);
  assert.equal(report.records.length, fixture.cases.length * fixture.policies.length);
  assert.equal(report.records.every(record => record.exact), true);
  process.stdout.write(`${JSON.stringify({ status: "verified-provenance-policy-ablation-v1", fixture_sha256: report.fixture_sha256, records: report.records.length, summary: report.summary }, null, 2)}\n`);
}

if (require.main === module) {
  if (process.argv.length !== 4) throw new Error("usage: node verify.cjs FIXTURE.json REPORT.json");
  verify(path.resolve(process.argv[2]), path.resolve(process.argv[3]));
}
module.exports = { verify };
