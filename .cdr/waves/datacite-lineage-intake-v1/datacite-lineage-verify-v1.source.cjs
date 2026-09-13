#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { parseRecord, prepareBundle, sha256 } = require("./datacite-lineage");

function verify(descriptorPath) {
  const absolute = path.resolve(descriptorPath);
  const descriptor = JSON.parse(fs.readFileSync(absolute, "utf8"));
  assert.equal(descriptor.schema_version, "datacite-lineage-intake-v1");
  assert.equal(typeof descriptor.retrieved_at, "string");
  assert.equal(descriptor.api_base, "https://api.datacite.org/dois/");
  assert.ok(Array.isArray(descriptor.records) && descriptor.records.length > 0 && descriptor.records.length <= 17);
  const rawRecords = descriptor.records.map(record => {
    const file = path.resolve(path.dirname(absolute), record.receipt_file);
    const bytes = fs.readFileSync(file);
    assert.equal(sha256(bytes), record.source_group_attestation.external_receipt_sha256, `${record.doi}: receipt hash`);
    assert.equal(parseRecord(bytes).doi, record.doi, `${record.doi}: receipt identity`);
    return bytes;
  });
  const replay = prepareBundle(rawRecords);
  assert.deepEqual(descriptor.records.map(({ receipt_file, ...record }) => record), replay);
  const roots = [...new Set(replay.map(record => record.source_group_attestation.lineage_id))];
  const result = { status: "verified-datacite-lineage-intake-v1", requested_doi: descriptor.requested_doi, records: replay.length, lineage_roots: roots };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return result;
}

if (require.main === module) {
  if (process.argv.length !== 3) throw new Error("usage: node world/datacite-lineage-verify.cjs DESCRIPTOR.json");
  verify(process.argv[2]);
}
module.exports = { verify };
