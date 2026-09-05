"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { createSnapshot, runTrustedQuery } = require("../../../cognitive-memory");

const root = __dirname;
const datasetPath = path.join(root, "dataset.json");
const CONTROL_BYTE = "~";
const FORBIDDEN_PROMPT_FIELDS = ["hidden_answer_contract", "expected_result", "categories"];
const stable = value => Array.isArray(value) ? `[${value.map(stable).join(",")}]` : value && typeof value === "object" ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}` : JSON.stringify(value);
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");

// This is deliberately an offline accounting abstraction: one UTF-8 byte is
// one slot unit. It is not a claim about any provider or model tokenizer.
const offlineByteTokenizerV1 = text => Buffer.byteLength(text, "utf8");

function slotSize(dataset, fixture) {
  const size = dataset.evidence_slots && dataset.evidence_slots[fixture.id];
  assert.ok(Number.isInteger(size) && size > 0, `${fixture.id}: pre-registered slot size`);
  return size;
}

function baseMaterial(fixture) {
  return `TRUSTED_PROOF_EVAL_V1\nACCEPTED_SNAPSHOT=${stable(fixture.accepted_snapshot)}\nQUERY=${fixture.query}\nEVIDENCE_SLOT_BEGIN\n`;
}

function assembleCase(dataset, fixture, trustedResult) {
  const declaredSlotBytes = slotSize(dataset, fixture);
  const proofPayload = stable(trustedResult);
  const proofBytes = offlineByteTokenizerV1(proofPayload);
  if (proofBytes > declaredSlotBytes) throw new Error(`${fixture.id}: unavailable: trusted proof/missing result exceeds declared slot`);
  const prefix = baseMaterial(fixture);
  const suffix = "\nEVIDENCE_SLOT_END\n";
  const p0Slot = CONTROL_BYTE.repeat(declaredSlotBytes);
  const p1Slot = `${proofPayload}${CONTROL_BYTE.repeat(declaredSlotBytes - proofBytes)}`;
  const p0 = `${prefix}${p0Slot}${suffix}`;
  const p1 = `${prefix}${p1Slot}${suffix}`;
  return { fixture, declaredSlotBytes, proofBytes, prefix, suffix, p0Slot, p1Slot, p0, p1 };
}

function assertNoOracleLeak(pair) {
  assert.match(pair.p0Slot, /^~+$/, `${pair.fixture.id}: P0 control marker must be semantically inert`);
  for (const forbidden of FORBIDDEN_PROMPT_FIELDS) {
    assert.equal(pair.p0.includes(forbidden), false, `${pair.fixture.id}: P0 oracle/control leak ${forbidden}`);
    assert.equal(pair.p1.includes(forbidden), false, `${pair.fixture.id}: P1 oracle leak ${forbidden}`);
  }
}

function validatePair(pair) {
  const { prefix, suffix, p0, p1, p0Slot, p1Slot, declaredSlotBytes, fixture } = pair;
  assert.equal(offlineByteTokenizerV1(p0Slot), declaredSlotBytes, `${fixture.id}: P0 slot budget`);
  assert.equal(offlineByteTokenizerV1(p1Slot), declaredSlotBytes, `${fixture.id}: P1 slot budget`);
  assert.equal(offlineByteTokenizerV1(p0), offlineByteTokenizerV1(p1), `${fixture.id}: equal offline request budget`);
  assert.equal(p0.slice(0, prefix.length), p1.slice(0, prefix.length), `${fixture.id}: mutation before slot`);
  assert.equal(p0.slice(prefix.length + p0Slot.length), p1.slice(prefix.length + p1Slot.length), `${fixture.id}: mutation after slot`);
  assert.equal(p0.endsWith(suffix) && p1.endsWith(suffix), true, `${fixture.id}: slot suffix`);
  assertNoOracleLeak(pair);
  return { id: fixture.id, slot_bytes: declaredSlotBytes, proof_bytes: pair.proofBytes, offline_request_budget: offlineByteTokenizerV1(p0), equality_digest: sha256(stable({ snapshot: fixture.accepted_snapshot, query: fixture.query, slot_bytes: declaredSlotBytes, offline_request_budget: offlineByteTokenizerV1(p0) })) };
}

async function validateDataset(dataset) {
  assert.equal(dataset.cases.length, 12, "fixed 12-case fixture");
  assert.equal(Object.keys(dataset.evidence_slots || {}).length, 12, "every case has exactly one declared slot");
  const results = [];
  for (const fixture of dataset.cases) {
    const snapshot = createSnapshot(fixture.accepted_snapshot);
    const trustedResult = (await runTrustedQuery({ snapshot, goal: fixture.query })).proof.result;
    assert.deepEqual(trustedResult, fixture.expected_result, `${fixture.id}: trusted result before slot assembly`);
    results.push(validatePair(assembleCase(dataset, fixture, trustedResult)));
  }
  return results;
}

async function main() {
  const raw = fs.readFileSync(datasetPath);
  const dataset = JSON.parse(raw);
  const cases = await validateDataset(dataset);
  console.log(JSON.stringify({ status: "offline-equal-budget-slot-ok", tokenizer: "offline-utf8-byte-v1 (accounting abstraction; not a provider/model token claim)", dataset_sha256: sha256(raw), case_count: cases.length, cases }, null, 2));
}

module.exports = { assembleCase, assertNoOracleLeak, offlineByteTokenizerV1, stable, validateDataset, validatePair };
if (require.main === module) main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
