#!/usr/bin/env node
"use strict";

// V5 narrows source authority while preserving v2's complete record/artifact gates.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { buildRegistry, INPUT_MODE, SAMPLING, WIRE_COMMIT, WIRE_SOURCES, sha256 } = require("./build-wire-authority-prompt-digest-registry-v5");
const { assembleCondition, immutableInputs } = require("../../../trusted-proof-preflight");
const { stable } = require("./validate-equal-budget-slots-v1");
const { validateEnvelope: validateV2 } = require("./validate-receipt-intake-v2");
const root = __dirname;
const isHash = x => typeof x === "string" && /^[0-9a-f]{64}$/.test(x);
const clone = x => JSON.parse(JSON.stringify(x));
const fail = x => { throw new Error(`receipt-intake-v5: ${x}`); };
const required = (x, keys, label) => keys.forEach(k => { if (!Object.prototype.hasOwnProperty.call(x || {}, k)) fail(`${label}.${k} is required`); });
function exactSampling(value) { if (!value || typeof value !== "object" || Array.isArray(value) || stable(Object.keys(value).sort()) !== stable(SAMPLING.keys)) fail("run.sampling must contain exactly temperature and top_p"); for (const key of SAMPLING.keys) if (!Number.isFinite(value[key]) || value[key] < SAMPLING[key].minimum || value[key] > SAMPLING[key].maximum) fail(`run.sampling.${key} is outside its registered bound`); }
function selfHash(registry) { const { registry_sha256, ...payload } = registry; return isHash(registry_sha256) && registry_sha256 === sha256(stable(payload)); }
async function trustedInputs(override) {
  const registry = override || JSON.parse(fs.readFileSync(path.join(root, "wire-authority-assembled-prompt-digest-registry-v5.json"), "utf8"));
  required(registry, ["protocol_version", "source_commit", "dataset", "slot_registration", "trusted_proof_digest_registry", "no_live_assembler", "wire", "case_prompt_digests", "registry_sha256"], "wire authority registry");
  if (registry.protocol_version !== "wire-authority-assembled-prompt-digest-registry-v5" || registry.source_commit !== WIRE_COMMIT || !registry.wire || registry.wire.authority_commit !== WIRE_COMMIT || registry.wire.input_mode !== INPUT_MODE || stable(registry.wire.source_sha256) !== stable(WIRE_SOURCES) || stable(registry.wire.sampling) !== stable(SAMPLING)) fail("v5 wire authority or sampling binding mismatch");
  const ids = registry.wire.template_identities;
  if (!ids || !isHash(ids.base_prompt_sha256) || !isHash(ids.wrapper_prompt_sha256) || stable(ids) !== stable(registry.no_live_assembler.template_identities)) fail("literal wire template or sealed assembler identity mismatch");
  if (!selfHash(registry)) fail("wire authority registry self-hash mismatch");
  const rebuilt = await buildRegistry(); if (stable(registry) !== stable(rebuilt)) fail("wire authority registry does not reproduce from sealed assembler and pinned transport sources");
  return registry;
}
function legacyView(envelope) { const v2 = clone(envelope); v2.schema_version = "cognitive-proof-eval-receipt-intake-v2"; v2.source_commit = "82bcc82fca8d8ebb2734e1006b754a6d4e31b4ac"; v2.actual_prompt_digest_registry = { path: "actual-assembled-prompt-digest-registry-v1.json", sha256: "198bcd6ab78bcee84c3b3333ba88c6f38e0362dd398ba7e083370a2db8da5e05" }; v2.run = { ...v2.run, base_prompt_sha256: "a".repeat(64), wrapper_prompt_sha256: "b".repeat(64) }; delete v2.run.input_mode; const binding = sha256(JSON.stringify(v2.run)); v2.records = v2.records.map(r => ({ ...r, run_binding_sha256: binding })); return v2; }
async function validateEnvelope(envelope, options = {}) {
  required(envelope, ["schema_version", "kind", "source_commit", "dataset", "slot_registration", "trusted_proof_digest_registry", "wire_authority_prompt_digest_registry", "run", "records"], "envelope");
  if (envelope.schema_version !== "cognitive-proof-eval-receipt-intake-v5" || !["synthetic_non_result", "candidate_live_receipt"].includes(envelope.kind)) fail("unsupported v5 schema version or kind");
  required(envelope.run, ["model", "adapter", "base_prompt_sha256", "wrapper_prompt_sha256", "input_mode", "sampling", "retry_policy"], "run"); exactSampling(envelope.run.sampling);
  const registry = await trustedInputs(options.registryOverride);
  if (envelope.wire_authority_prompt_digest_registry.path !== "wire-authority-assembled-prompt-digest-registry-v5.json" || envelope.wire_authority_prompt_digest_registry.sha256 !== registry.registry_sha256 || envelope.source_commit !== registry.source_commit || envelope.dataset.sha256 !== registry.dataset.sha256 || envelope.slot_registration.sha256 !== registry.slot_registration.sha256 || envelope.trusted_proof_digest_registry.sha256 !== registry.trusted_proof_digest_registry.sha256) fail("immutable envelope binding mismatch");
  if (envelope.run.input_mode !== INPUT_MODE || stable({ base_prompt_sha256: envelope.run.base_prompt_sha256, wrapper_prompt_sha256: envelope.run.wrapper_prompt_sha256 }) !== stable(registry.wire.template_identities)) fail("run literal wire identity or input mode mismatch");
  const binding = sha256(JSON.stringify(envelope.run)); for (const record of envelope.records || []) { if (!record || record.run_binding_sha256 !== binding) fail("record model/adapter/literal-wire/prompt/sampling/retry binding mismatch"); if (!registry.case_prompt_digests[record.case_id] || record.prompt_sha256 !== registry.case_prompt_digests[record.case_id][record.condition]) fail("sealed prompt digest does not match registered case/condition"); }
  const result = await validateV2(legacyView(envelope), { rawRoot: options.rawRoot }); return { status: result.status === "synthetic-valid-not-aggregable" ? "synthetic-valid-not-aggregable-v5" : "candidate-integrity-valid-not-a-result-v5", records: result.records };
}
async function mustReject(fixture, mutate, options) { const x = clone(fixture); mutate(x); await assert.rejects(() => validateEnvelope(x, options), /receipt-intake-v5:|receipt-intake-v2:/); }
function rehash(x) { const { registry_sha256, ...payload } = x; x.registry_sha256 = sha256(stable(payload)); }
async function selfTest() {
  const fixture = JSON.parse(fs.readFileSync(path.join(root, "receipt-intake-v5.synthetic.json"), "utf8")); assert.equal((await validateEnvelope(fixture)).status, "synthetic-valid-not-aggregable-v5");
  for (const version of ["v1", "v2", "v3", "v4"]) await mustReject(fixture, x => { x.schema_version = `cognitive-proof-eval-receipt-intake-${version}`; });
  await mustReject(fixture, x => { x.run.sampling.seed = 0; }); await mustReject(fixture, x => { x.run.input_mode = "wrapper-added"; }); await mustReject(fixture, x => { [x.records[0].prompt_sha256, x.records[1].prompt_sha256] = [x.records[1].prompt_sha256, x.records[0].prompt_sha256]; });
  const originalRead = fs.readFileSync; let consumerRead = false;
  try { fs.readFileSync = (file, ...rest) => { if (/trusted-proof-live-candidate(?:-config-v3)?\\.(?:js|json)$/.test(String(file))) { consumerRead = true; throw new Error("consumer source must not be consulted"); } return originalRead(file, ...rest); }; const consumerNeutral = await buildRegistry(); assert.deepEqual(Object.keys(consumerNeutral.wire.source_sha256).sort(), Object.keys(WIRE_SOURCES).sort()); assert.ok(!JSON.stringify(consumerNeutral).includes("trusted-proof-live-candidate")); assert.equal((await validateEnvelope(fixture, { registryOverride: consumerNeutral })).status, "synthetic-valid-not-aggregable-v5"); } finally { fs.readFileSync = originalRead; }
  assert.equal(consumerRead, false, "consumer-only source must not affect v5 registration or validation");
  for (const file of Object.keys(WIRE_SOURCES)) { const drift = clone(await buildRegistry()); drift.wire.source_sha256[file] = "f".repeat(64); rehash(drift); await assert.rejects(() => trustedInputs(drift), /v5 wire authority or sampling binding mismatch/); }
  for (const mutate of [x => { x.wire.template_identities.base_prompt_sha256 = "f".repeat(64); }, x => { x.wire.input_mode = "wrong"; }, x => { x.wire.sampling.request_mapping.top_p = "wrong"; }]) { const drift = clone(await buildRegistry()); mutate(drift); rehash(drift); await assert.rejects(() => trustedInputs(drift), /v5 wire authority|literal wire template/); }
  const rawRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cdr-intake-v5-")); try { const candidate = clone(fixture); candidate.kind = "candidate_live_receipt"; const r = candidate.records[0], inputs = immutableInputs(), source = inputs.dataset.cases.find(x => x.id === r.case_id), config = { source_commit: WIRE_COMMIT, model: "SYNTHETIC-NOT-A-MODEL", base_prompt_sha256: candidate.run.base_prompt_sha256, wrapper_prompt_sha256: candidate.run.wrapper_prompt_sha256, sampling: candidate.run.sampling, retry_policy: "none", dataset_sha256: inputs.dataset_sha256, slot_registration_file_sha256: inputs.registration_sha256, slot_registration_sha256: inputs.binding.slot_registration_sha256 }, sealed = await assembleCondition({ fixture: source, inputs, config, condition: "P0" }); fs.mkdirSync(path.join(rawRoot, "synthetic")); fs.writeFileSync(path.join(rawRoot, "synthetic/prompt"), sealed.prompt); fs.writeFileSync(path.join(rawRoot, "synthetic/raw"), "changed raw"); r.prompt = { ref: "local://synthetic/prompt", sha256: sha256(sealed.prompt) }; r.raw = { ref: "local://synthetic/raw", sha256: sha256("declared raw") }; await assert.rejects(() => validateEnvelope(candidate, { rawRoot }), /raw artifact SHA-256 mismatch/); } finally { fs.rmSync(rawRoot, { recursive: true, force: true }); }
  return { status: "receipt-intake-v5-self-test-ok" };
}
if (require.main === module) { const a = process.argv.slice(2); (a.includes("--self-test") ? selfTest() : validateEnvelope(JSON.parse(fs.readFileSync(a[0] || path.join(root, "receipt-intake-v5.synthetic.json"), "utf8")))).then(x => console.log(JSON.stringify(x, null, 2))).catch(e => { console.error(e.stack || e); process.exitCode = 1; }); }
module.exports = { exactSampling, selfTest, trustedInputs, validateEnvelope };
