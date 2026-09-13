#!/usr/bin/env node
"use strict";

// V3 deliberately starts from the *active* snapshot produced by V2's audited
// world builder.  No prompt contains an event history: temporal projection is
// therefore held constant and cannot explain a condition difference.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { buildCase, caseSpec, stable } = require("../temporal-relational-stress/generator.cjs");

const VERSION = "temporal-receipt-ablation-fixture-v3";
const SEED = "temporal-receipt-ablation-v3-20260913";
// The journal admission cap is 100 items; 7 and 8 are the deepest relational
// strata that keep a diamond world's stable batch below that cap.
const DEPTHS = [7, 8];
const TOPOLOGIES = ["relational_chain_of_joins", "relational_diamond"];
const REVISION_COUNTS = [2, 4]; // construction diversity only; history is never shown.
const STATUSES = ["entailed", "contradicted", "unknown", "conflict"];
const CONDITIONS = ["L", "V", "S", "F"];
const sha256 = text => crypto.createHash("sha256").update(text).digest("hex");

function receipt(item, fields) {
  const all = item.checker_receipt;
  const value = { version: "receipt-ablation-v3", snapshot_sha256: all.snapshot_sha256, query: all.query };
  for (const field of fields) value[field] = all[field];
  return JSON.stringify(value);
}

function prompts(item) {
  const base = item.prompts.p1f;
  return {
    l: base,
    v: `${base}\nTRUSTED VERDICT RECEIPT (it deliberately contains no support IDs):\n${receipt(item, ["status"])}`,
    s: `${base}\nTRUSTED SUPPORT RECEIPT (it deliberately contains no status field):\n${receipt(item, ["positive_support_sets", "negative_support_sets"])}`,
    f: `${base}\nTRUSTED FULL RECEIPT:\n${receipt(item, ["status", "positive_support_sets", "negative_support_sets"])}`,
  };
}

async function generateFixture() {
  const cases = []; let ordinal = 1;
  for (const depth of DEPTHS) for (const topology of TOPOLOGIES) for (const revisionCount of REVISION_COUNTS) for (const status of STATUSES) {
    const source = await buildCase(caseSpec(depth, topology, revisionCount, status, ordinal++));
    const item = {
      case_id: source.case_id.replace("trv2", "rav3"),
      stratum: { ...source.stratum },
      formal_world: source.formal_world,
      oracle: source.oracle,
      scorer_only: { active_snapshot_sha256: source.scorer_only.active_snapshot_sha256 },
      prompts: prompts(source),
    };
    if (Object.values(item.prompts).some(value => value.includes(source.case_id))) throw new Error(`${item.case_id}: identifier leak`);
    if (item.prompts.l.includes('"status"')) throw new Error(`${item.case_id}: L leaks a verdict`);
    if (item.prompts.s.includes('"status"')) throw new Error(`${item.case_id}: S leaks a verdict`);
    cases.push(item);
  }
  return { schema_version: VERSION, seed: SEED, design: { depths: DEPTHS, topologies: TOPOLOGIES, construction_revision_counts: REVISION_COUNTS, statuses: STATUSES, conditions: CONDITIONS, temporal_projection: "constant: final active snapshot in every condition", receipt_ablations: { L: "no receipt", V: "status only", S: "support IDs only", F: "status plus support IDs" } }, cases };
}

function writeFixture(file, fixture) {
  const bytes = stable(fixture); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, bytes, { flag: "wx" });
  return { file: path.resolve(file), bytes: Buffer.byteLength(bytes), sha256: sha256(bytes) };
}
if (require.main === module) generateFixture().then(fixture => {
  const output = process.argv[2]; if (!output || process.argv.length !== 3) throw new Error("usage: node generator.cjs OUTPUT.json");
  process.stdout.write(`${JSON.stringify({ status: "ok", cases: fixture.cases.length, ...writeFixture(output, fixture) })}\n`);
}).catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
module.exports = { CONDITIONS, DEPTHS, REVISION_COUNTS, SEED, STATUSES, TOPOLOGIES, VERSION, generateFixture, stable, writeFixture };
