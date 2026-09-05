"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createSnapshot, runTrustedQuery } = require("./cognitive-memory");
const { assembleCase, slotRegistrationHash, validateDataset, validatePair } = require("./.cdr/waves/cognitive-proof-eval-v1/validate-equal-budget-slots-v1");

async function main() {
  const dataset = JSON.parse(fs.readFileSync(path.join(__dirname, ".cdr/waves/cognitive-proof-eval-v1/dataset.json")));
  const result = await validateDataset(dataset);
  assert.equal(result.cases.length, 12);
  const fixture = dataset.cases[0];
  const trustedResult = (await runTrustedQuery({ snapshot: createSnapshot(fixture.accepted_snapshot), goal: fixture.query })).proof.result;
  assert.throws(() => assembleCase(dataset, fixture, { proof: "x".repeat(dataset.evidence_slots[fixture.id]) }), /unavailable/);
  const pair = assembleCase(dataset, fixture, trustedResult);
  assert.throws(() => validatePair({ ...pair, p1: `MUTATED${pair.p1.slice(7)}` }), /mutation before slot/);
  assert.throws(() => validatePair({ ...pair, p1Slot: pair.p1Slot.slice(0, -1) }), /P1 slot budget|equal offline request budget/);
  assert.throws(() => validatePair({ ...pair, p0Slot: "hidden_answer_contract".padEnd(pair.declaredSlotBytes, "~"), p0: `${pair.prefix}${"hidden_answer_contract".padEnd(pair.declaredSlotBytes, "~")}${pair.suffix}` }), /semantically inert|oracle\/control leak/);
  const changedSlot = structuredClone(dataset);
  changedSlot.evidence_slots[fixture.id] += 1;
  await assert.rejects(validateDataset(changedSlot), /dataset slot registration binding/);
  const rewrittenPair = assembleCase(changedSlot, fixture, trustedResult);
  assert.equal(rewrittenPair.declaredSlotBytes, pair.declaredSlotBytes + 1);
  assert.throws(() => validatePair(rewrittenPair), /dataset slot registration binding/);
  const changedRegistration = { protocol_version: "trusted-proof-evidence-slots-v1", case_slots: structuredClone(dataset.evidence_slots) };
  changedRegistration.case_slots[fixture.id] += 1;
  changedRegistration.registration_sha256 = slotRegistrationHash(changedRegistration.case_slots);
  await assert.rejects(validateDataset(changedSlot, changedRegistration), /method slot registration binding|manifest slot registration binding/);
  const missingMapping = structuredClone(dataset);
  delete missingMapping.evidence_slots[fixture.id];
  await assert.rejects(validateDataset(missingMapping), /missing or extra case/);
  const extraMapping = structuredClone(dataset);
  extraMapping.evidence_slots.post_hoc_case = 1024;
  await assert.rejects(validateDataset(extraMapping), /missing or extra case/);
  console.log("trusted-proof-equal-budget-tests-ok: 12 valid cases plus slot binding, post-hoc rewrite, registration, missing/extra mapping, overlong, outside-slot, unequal-slot, and oracle/control-leak rejections");
}

main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
