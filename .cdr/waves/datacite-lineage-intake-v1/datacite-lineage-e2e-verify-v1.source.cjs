#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { buildReport } = require("./datacite-lineage-e2e.cjs");

async function main(argv = process.argv.slice(2)) {
  if (argv.length !== 3) throw new Error("usage: node world/datacite-lineage-e2e-verify.cjs VERSIONS.json DISTINCT.json REPORT.json");
  const [versions, distinct, reportFile] = argv.map(value => path.resolve(value));
  const expected = await buildReport(versions, distinct);
  const actual = JSON.parse(fs.readFileSync(reportFile, "utf8"));
  assert.deepEqual(actual, expected);
  assert.equal(Object.values(actual.scenarios).every(scenario => scenario.actual.v2.exact && scenario.actual.v3.exact), true);
  process.stdout.write(`${JSON.stringify({ status: "verified-datacite-lineage-world-e2e-v1", cells: 4, exact: 4 }, null, 2)}\n`);
}

main().catch(error => { process.stderr.write(`${error.stack || error.message}\n`); process.exitCode = 1; });
