#!/usr/bin/env node
"use strict";

// V6 is forward-only: v5 still supplies all transport, prompt, proof and
// artifact gates, while this layer makes provider-native usage auditable.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { buildRegistry, sha256 } = require("./build-wire-authority-prompt-digest-registry-v6");
const { stable } = require("./validate-equal-budget-slots-v1");
const { selfTest: selfTestV5, validateEnvelope: validateV5 } = require("./validate-receipt-intake-v5");
const root = __dirname;
const clone = value => JSON.parse(JSON.stringify(value));
const fail = message => { throw new Error(`receipt-intake-v6: ${message}`); };
const own = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);
const exactKeys = (value, keys) => value && typeof value === "object" && !Array.isArray(value) && stable(Object.keys(value).sort()) === stable([...keys].sort());
const nativeInteger = value => Number.isSafeInteger(value) && value >= 0;
function usageShape(record) {
  const usage = record && record.usage, native = usage && usage.provider_usage;
  if (!exactKeys(usage, ["measured_effective_context_budget", "provider_usage"])) fail(`${record && record.record_id || "record"}: usage must contain exactly measured_effective_context_budget and provider_usage`);
  if (!exactKeys(native, ["input_tokens", "output_tokens", "total_tokens"])) fail(`${record.record_id}: provider_usage must contain exactly input_tokens, output_tokens and total_tokens`);
  if (![native.input_tokens, native.output_tokens, native.total_tokens, usage.measured_effective_context_budget].every(nativeInteger)) fail(`${record.record_id}: native usage and measured E must be non-negative safe integers`);
  if (native.total_tokens !== native.input_tokens + native.output_tokens) fail(`${record.record_id}: native total_tokens must equal input_tokens + output_tokens`);
  if (usage.measured_effective_context_budget !== native.input_tokens) fail(`${record.record_id}: measured effective context budget must equal native input_tokens`);
}
function registryValid(registry) {
  const { registry_sha256, ...payload } = registry || {};
  return registry && registry.protocol_version === "wire-authority-assembled-prompt-digest-registry-v6" && typeof registry_sha256 === "string" && /^[0-9a-f]{64}$/.test(registry_sha256) && registry_sha256 === sha256(stable(payload));
}
async function trustedRegistry(override) {
  const registry = override || JSON.parse(fs.readFileSync(path.join(root, "wire-authority-assembled-prompt-digest-registry-v6.json"), "utf8"));
  if (!registryValid(registry)) fail("v6 wire authority registry self-hash or protocol mismatch");
  const rebuilt = await buildRegistry();
  if (stable(registry) !== stable(rebuilt)) fail("v6 wire authority registry does not reproduce from sealed v5 authority");
  return registry;
}
function v5Compatible(envelope) {
  const value = clone(envelope);
  value.schema_version = "cognitive-proof-eval-receipt-intake-v5";
  value.wire_authority_prompt_digest_registry = { path: "wire-authority-assembled-prompt-digest-registry-v5.json", sha256: require("./wire-authority-assembled-prompt-digest-registry-v5.json").registry_sha256 };
  // V2 (behind V5) predates zero-valued synthetic/native usage and only uses
  // this compatibility E for its historical positive-integer shape gate.
  value.records.forEach(record => { record.usage.measured_effective_context_budget = 1; });
  return value;
}
async function validateEnvelope(envelope, options = {}) {
  if (!envelope || envelope.schema_version !== "cognitive-proof-eval-receipt-intake-v6" || !["synthetic_non_result", "candidate_live_receipt"].includes(envelope.kind)) fail("unsupported v6 schema version or kind");
  if (!own(envelope, "wire_authority_prompt_digest_registry") || envelope.wire_authority_prompt_digest_registry.path !== "wire-authority-assembled-prompt-digest-registry-v6.json") fail("v6 registry reference is required");
  const registry = await trustedRegistry(options.registryOverride);
  if (envelope.wire_authority_prompt_digest_registry.sha256 !== registry.registry_sha256) fail("v6 registry reference hash mismatch");
  if (!Array.isArray(envelope.records) || !envelope.records.length) fail("records are required");
  envelope.records.forEach(usageShape);
  const pairedE = new Map();
  for (const record of envelope.records) {
    const previous = pairedE.get(record.case_id);
    if (previous !== undefined && previous !== record.usage.measured_effective_context_budget) fail(`${record.case_id}: unequal P0/P1 immutable binding or E`);
    pairedE.set(record.case_id, record.usage.measured_effective_context_budget);
  }
  const result = await validateV5(v5Compatible(envelope), { rawRoot: options.rawRoot });
  return { status: result.status === "synthetic-valid-not-aggregable-v5" ? "synthetic-valid-not-aggregable-v6" : "candidate-integrity-valid-not-a-result-v6", records: result.records };
}
async function mustReject(fixture, mutate) { const value = clone(fixture); mutate(value); await assert.rejects(() => validateEnvelope(value), /receipt-intake-v6:|receipt-intake-v5:|receipt-intake-v2:/); }
async function selfTest() {
  const fixture = JSON.parse(fs.readFileSync(path.join(root, "receipt-intake-v6.synthetic.json"), "utf8"));
  assert.equal((await validateEnvelope(fixture)).status, "synthetic-valid-not-aggregable-v6");
  for (const version of ["v1", "v2", "v3", "v4", "v5"]) await mustReject(fixture, value => { value.schema_version = `cognitive-proof-eval-receipt-intake-${version}`; });
  const mutations = [
    value => { delete value.records[0].usage.provider_usage.input_tokens; }, value => { value.records[0].usage.provider_usage.extra = 0; }, value => { value.records[0].usage.provider_usage.input_tokens = "0"; }, value => { value.records[0].usage.provider_usage.input_tokens = NaN; }, value => { value.records[0].usage.provider_usage.output_tokens = .5; }, value => { value.records[0].usage.provider_usage.total_tokens = -1; }, value => { value.records[0].usage.provider_usage.total_tokens = 1; }, value => { value.records[0].usage.measured_effective_context_budget = 1; }, value => { value.records[0].usage.provider_usage.input_tokens = Number.MAX_SAFE_INTEGER + 1; }
  ];
  for (const mutate of mutations) await mustReject(fixture, mutate);
  await mustReject(fixture, value => { value.records[1].usage.provider_usage.input_tokens = 1; value.records[1].usage.provider_usage.total_tokens = 1; value.records[1].usage.measured_effective_context_budget = 1; });
  await mustReject(fixture, value => { value.records[0].prompt_sha256 = "f".repeat(64); });
  await mustReject(fixture, value => { value.run.sampling.seed = 0; });
  const tampered = await buildRegistry(); tampered.authority_registry.sha256 = "f".repeat(64); const { registry_sha256, ...payload } = tampered; tampered.registry_sha256 = sha256(stable(payload)); await assert.rejects(() => trustedRegistry(tampered), /does not reproduce/);
  await selfTestV5(); // Mutation coverage for every inherited v5 authority/artifact gate.
  return { status: "receipt-intake-v6-self-test-ok" };
}
if (require.main === module) { const args = process.argv.slice(2); (args.includes("--self-test") ? selfTest() : validateEnvelope(JSON.parse(fs.readFileSync(args[0] || path.join(root, "receipt-intake-v6.synthetic.json"), "utf8")))).then(value => console.log(JSON.stringify(value, null, 2))).catch(error => { console.error(error.stack || error); process.exitCode = 1; }); }
module.exports = { nativeInteger, selfTest, trustedRegistry, usageShape, validateEnvelope };
