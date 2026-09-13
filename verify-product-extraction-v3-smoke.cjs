"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { readFixture, verifyReport } = require("./product-extraction-v3-smoke.cjs");

const reportFile = process.argv[2];
const fixtureFile = process.argv[3];
if (!reportFile || !fixtureFile) {
  console.error("usage: node verify-product-extraction-v3-smoke.cjs REPORT FIXTURE");
  process.exitCode = 2;
} else {
  try {
    const report = JSON.parse(fs.readFileSync(path.resolve(reportFile), "utf8"));
    const fixture = readFixture(path.resolve(fixtureFile));
    if (report.fixture_sha256 !== fixture.sha256 || report.case_id !== fixture.fixture.case_id || report.source_text !== fixture.fixture.source_text)
      throw new Error("fixture binding mismatch");
    process.stdout.write(`${JSON.stringify(verifyReport(report))}\n`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
