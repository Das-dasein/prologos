"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createSnapshot, runTrustedQuery } = require("./cognitive-memory");
const { assembleCase, validateDataset, validatePair } = require("./.cdr/waves/cognitive-proof-eval-v1/validate-equal-budget-slots-v1");

async function main() {
  const dataset = JSON.parse(fs.readFileSync(path.join(__dirname, ".cdr/waves/cognitive-proof-eval-v1/dataset.json")));
  const result = await validateDataset(dataset);
  assert.equal(result.length, 12);
  const fixture = dataset.cases[0];
  const trustedResult = (await runTrustedQuery({ snapshot: createSnapshot(fixture.accepted_snapshot), goal: fixture.query })).proof.result;
  assert.throws(() => assembleCase(dataset, fixture, { proof: "x".repeat(dataset.evidence_slots[fixture.id]) }), /unavailable/);
  const pair = assembleCase(dataset, fixture, trustedResult);
  assert.throws(() => validatePair({ ...pair, p1: `MUTATED${pair.p1.slice(7)}` }), /mutation before slot/);
  assert.throws(() => validatePair({ ...pair, p1Slot: pair.p1Slot.slice(0, -1) }), /P1 slot budget|equal offline request budget/);
  assert.throws(() => validatePair({ ...pair, p0Slot: "hidden_answer_contract".padEnd(pair.declaredSlotBytes, "~"), p0: `${pair.prefix}${"hidden_answer_contract".padEnd(pair.declaredSlotBytes, "~")}${pair.suffix}` }), /semantically inert|oracle\/control leak/);
  console.log("trusted-proof-equal-budget-tests-ok: 12 valid cases plus overlong, outside-slot, unequal-slot, and oracle/control-leak rejections");
}

main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
