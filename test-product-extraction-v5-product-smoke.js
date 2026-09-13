"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { verifyReport } = require("./product-extraction-v5-product-smoke.cjs");

const fixture = path.join(__dirname, ".cdr/waves/product-extraction-v5-product-smoke-v1/fixture.json");
const report = JSON.parse(fs.readFileSync(path.join(__dirname, "reports/product-extraction-v5-product-smoke-v1/luna/report.json"), "utf8"));
const verified = verifyReport(report, fixture);
assert.equal(verified.status, "verified-product-extraction-v5-product-smoke-v1");
assert.equal(verified.decision, "write");
assert.equal(verified.admission_status, "primary_proposed_unadmitted");
assert.equal(report.admission_writes, 0);
console.log("product extraction v5 product smoke ok: live candidate is policy-bound and remains unadmitted");
