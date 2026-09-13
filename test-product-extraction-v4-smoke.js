"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { verifyReport } = require("./product-extraction-v4-smoke.cjs");

const report = JSON.parse(fs.readFileSync(path.join(__dirname, "reports/product-extraction-v4-smoke-v1/luna/report.json"), "utf8"));
const verified = verifyReport(report);
assert.equal(verified.status, "verified-product-extraction-v4-smoke-v1");
assert.equal(verified.decision, "clarify");
assert.equal(report.candidate.assertions.length, 0);
assert.equal(report.candidate.clarification.evidence_span, "He uses Python.");
assert.equal(report.admission_writes, 0);
console.log("product extraction v4 smoke ok: one live clarify decision, replayed locally, zero admission writes");
