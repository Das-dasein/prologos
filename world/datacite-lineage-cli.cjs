#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { fetchBundle, prepareBundle, storeRawReceipts } = require("./datacite-lineage");

function option(argv, name) { const index = argv.indexOf(name); return index < 0 ? null : argv[index + 1]; }

async function main(argv = process.argv.slice(2)) {
  const doi = option(argv, "--doi"), receiptDir = option(argv, "--receipt-dir"), out = option(argv, "--out");
  if (!doi || !receiptDir || !out) throw new Error("usage: node world/datacite-lineage-cli.cjs --doi DOI --receipt-dir DIR --out DESCRIPTOR.json");
  const rawRecords = await fetchBundle(doi, { userAgent: process.env.DATACITE_USER_AGENT || "prolog-agent-memory/0.1" });
  storeRawReceipts(rawRecords, receiptDir);
  const absoluteReceiptDir = path.resolve(receiptDir);
  const output = path.resolve(out);
  const descriptor = {
    schema_version: "datacite-lineage-intake-v1",
    requested_doi: doi,
    retrieved_at: new Date().toISOString(),
    api_base: "https://api.datacite.org/dois/",
    claim_boundary: "Lineage follows explicit DataCite DOI relation metadata. HTTPS retrieval and content hashes do not establish metadata truth or hidden derivations.",
    records: prepareBundle(rawRecords).map(record => ({
      ...record,
      receipt_file: path.relative(path.dirname(output), path.join(absoluteReceiptDir, `${record.source_group_attestation.external_receipt_sha256}.json`)),
    })),
  };
  if (fs.existsSync(output)) throw new Error("refusing to overwrite DataCite descriptor");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(descriptor, null, 2)}\n`, { mode: 0o600, flag: "wx" });
  process.stdout.write(`${JSON.stringify({ status: "datacite-lineage-intake-complete", records: descriptor.records.length, out: output })}\n`);
}

main().catch(error => { process.stderr.write(`${error.stack || error.message}\n`); process.exitCode = 1; });
