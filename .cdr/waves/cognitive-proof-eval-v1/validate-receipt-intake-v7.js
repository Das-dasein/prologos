#!/usr/bin/env node
"use strict";

// V7 is a forward-only rebind of V6's receipt and native-usage gates.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { buildRegistry, INPUT_MODE, SAMPLING, WIRE_COMMIT, WIRE_SOURCES, sha256 } = require("./build-wire-authority-prompt-digest-registry-v7");
const { stable } = require("./validate-equal-budget-slots-v1");
const { selfTest: selfTestV2, validateEnvelope: validateV2 } = require("./validate-receipt-intake-v2");
const { usageShape } = require("./validate-receipt-intake-v6");
const root = __dirname;
const clone = value => JSON.parse(JSON.stringify(value));
const isHash = value => typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
const own = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);
const fail = message => { throw new Error(`receipt-intake-v7: ${message}`); };
const required = (value, keys, label) => keys.forEach(key => { if (!own(value, key)) fail(`${label}.${key} is required`); });
function exactSampling(value) { if (!value || typeof value !== "object" || Array.isArray(value) || stable(Object.keys(value).sort()) !== stable(SAMPLING.keys)) fail("run.sampling must contain exactly temperature and top_p"); for (const key of SAMPLING.keys) if (!Number.isFinite(value[key]) || value[key] < SAMPLING[key].minimum || value[key] > SAMPLING[key].maximum) fail(`run.sampling.${key} is outside its registered bound`); }
function registryValid(registry) { const { registry_sha256, ...payload } = registry || {}; return registry && registry.protocol_version === "wire-authority-assembled-prompt-digest-registry-v7" && isHash(registry_sha256) && registry_sha256 === sha256(stable(payload)); }
async function trustedRegistry(override) {
  const registry = override || JSON.parse(fs.readFileSync(path.join(root, "wire-authority-assembled-prompt-digest-registry-v7.json"), "utf8"));
  required(registry, ["protocol_version", "source_commit", "dataset", "slot_registration", "trusted_proof_digest_registry", "no_live_assembler", "wire", "case_prompt_digests", "registry_sha256"], "wire authority registry");
  if (!registryValid(registry) || registry.source_commit !== WIRE_COMMIT || !registry.wire || registry.wire.authority_commit !== WIRE_COMMIT || registry.wire.input_mode !== INPUT_MODE || stable(registry.wire.source_sha256) !== stable(WIRE_SOURCES) || stable(registry.wire.sampling) !== stable(SAMPLING)) fail("v7 wire authority or sampling binding mismatch");
  const ids = registry.wire.template_identities;
  if (!ids || !isHash(ids.base_prompt_sha256) || !isHash(ids.wrapper_prompt_sha256) || stable(ids) !== stable(registry.no_live_assembler.template_identities)) fail("literal wire template or sealed assembler identity mismatch");
  const rebuilt = await buildRegistry(); if (stable(registry) !== stable(rebuilt)) fail("v7 wire authority registry does not reproduce from sealed assembler and pinned transport sources");
  return registry;
}
function v2Compatible(envelope) { const value = clone(envelope); value.schema_version = "cognitive-proof-eval-receipt-intake-v2"; value.source_commit = "82bcc82fca8d8ebb2734e1006b754a6d4e31b4ac"; value.actual_prompt_digest_registry = { path: "actual-assembled-prompt-digest-registry-v1.json", sha256: "198bcd6ab78bcee84c3b3333ba88c6f38e0362dd398ba7e083370a2db8da5e05" }; value.run = { ...value.run, base_prompt_sha256: "a".repeat(64), wrapper_prompt_sha256: "b".repeat(64) }; delete value.run.input_mode; const binding = sha256(JSON.stringify(value.run)); value.records = value.records.map(record => ({ ...record, run_binding_sha256: binding })); delete value.wire_authority_prompt_digest_registry; value.records.forEach(record => { record.usage.measured_effective_context_budget = 1; delete record.usage.provider_usage.total_tokens; }); return value; }
async function validateEnvelope(envelope, options = {}) {
  required(envelope, ["schema_version", "kind", "source_commit", "dataset", "slot_registration", "trusted_proof_digest_registry", "wire_authority_prompt_digest_registry", "run", "records"], "envelope");
  if (envelope.schema_version !== "cognitive-proof-eval-receipt-intake-v7" || !["synthetic_non_result", "candidate_live_receipt"].includes(envelope.kind)) fail("unsupported v7 schema version or kind");
  required(envelope.run, ["model", "adapter", "base_prompt_sha256", "wrapper_prompt_sha256", "input_mode", "sampling", "retry_policy"], "run"); exactSampling(envelope.run.sampling);
  const registry = await trustedRegistry(options.registryOverride);
  if (!own(envelope, "wire_authority_prompt_digest_registry") || envelope.wire_authority_prompt_digest_registry.path !== "wire-authority-assembled-prompt-digest-registry-v7.json" || envelope.wire_authority_prompt_digest_registry.sha256 !== registry.registry_sha256 || envelope.source_commit !== registry.source_commit || envelope.dataset.sha256 !== registry.dataset.sha256 || envelope.slot_registration.sha256 !== registry.slot_registration.sha256 || envelope.trusted_proof_digest_registry.sha256 !== registry.trusted_proof_digest_registry.sha256) fail("immutable envelope binding mismatch");
  if (envelope.run.input_mode !== INPUT_MODE || stable({ base_prompt_sha256: envelope.run.base_prompt_sha256, wrapper_prompt_sha256: envelope.run.wrapper_prompt_sha256 }) !== stable(registry.wire.template_identities)) fail("run literal wire identity or input mode mismatch");
  const binding = sha256(JSON.stringify(envelope.run)); for (const record of envelope.records || []) { if (!record || record.run_binding_sha256 !== binding) fail("record model/adapter/literal-wire/prompt/sampling/retry binding mismatch"); if (!registry.case_prompt_digests[record.case_id] || record.prompt_sha256 !== registry.case_prompt_digests[record.case_id][record.condition]) fail("sealed prompt digest does not match registered case/condition"); usageShape(record); }
  const paired = new Map(); for (const record of envelope.records) { const previous = paired.get(record.case_id); if (previous !== undefined && previous !== record.usage.measured_effective_context_budget) fail(`${record.case_id}: unequal P0/P1 immutable binding or E`); paired.set(record.case_id, record.usage.measured_effective_context_budget); }
  const result = await validateV2(v2Compatible(envelope), { rawRoot: options.rawRoot }); return { status: result.status === "synthetic-valid-not-aggregable" ? "synthetic-valid-not-aggregable-v7" : "candidate-integrity-valid-not-a-result-v7", records: result.records };
}
async function mustReject(fixture, mutate) { const value = clone(fixture); mutate(value); await assert.rejects(() => validateEnvelope(value), /receipt-intake-v7:|receipt-intake-v6:|receipt-intake-v2:/); }
function rehash(registry) { const { registry_sha256, ...payload } = registry; registry.registry_sha256 = sha256(stable(payload)); }
async function selfTest() {
  const fixture = JSON.parse(fs.readFileSync(path.join(root, "receipt-intake-v7.synthetic.json"), "utf8")); assert.equal((await validateEnvelope(fixture)).status, "synthetic-valid-not-aggregable-v7");
  for (const version of ["v1", "v2", "v3", "v4", "v5", "v6"]) await mustReject(fixture, value => { value.schema_version = `cognitive-proof-eval-receipt-intake-${version}`; });
  for (const mutate of [value => { delete value.records[0].usage.provider_usage.input_tokens; }, value => { value.records[0].usage.provider_usage.extra = 0; }, value => { value.records[0].usage.provider_usage.input_tokens = "0"; }, value => { value.records[0].usage.provider_usage.output_tokens = .5; }, value => { value.records[0].usage.provider_usage.total_tokens = -1; }, value => { value.records[0].usage.provider_usage.total_tokens = 1; }, value => { value.records[0].usage.measured_effective_context_budget = 1; }, value => { value.run.sampling.seed = 0; }, value => { value.run.input_mode = "wrapper-added"; }, value => { [value.records[0].prompt_sha256, value.records[1].prompt_sha256] = [value.records[1].prompt_sha256, value.records[0].prompt_sha256]; }]) await mustReject(fixture, mutate);
  for (const file of Object.keys(WIRE_SOURCES)) { const drift = clone(await buildRegistry()); drift.wire.source_sha256[file] = "f".repeat(64); rehash(drift); await assert.rejects(() => trustedRegistry(drift), /v7 wire authority or sampling binding mismatch/); }
  const drift = clone(await buildRegistry()); drift.wire.sampling.request_mapping.top_p = "wrong"; rehash(drift); await assert.rejects(() => trustedRegistry(drift), /v7 wire authority or sampling binding mismatch/);
  await selfTestV2(); // Every inherited record, prompt, proof and artifact mutation gate.
  return { status: "receipt-intake-v7-self-test-ok" };
}
if (require.main === module) { const args = process.argv.slice(2); (args.includes("--self-test") ? selfTest() : validateEnvelope(JSON.parse(fs.readFileSync(args[0] || path.join(root, "receipt-intake-v7.synthetic.json"), "utf8")))).then(value => console.log(JSON.stringify(value, null, 2))).catch(error => { console.error(error.stack || error); process.exitCode = 1; }); }
module.exports = { selfTest, trustedRegistry, validateEnvelope };
