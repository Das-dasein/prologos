#!/usr/bin/env node
"use strict";

// V4 is deliberately forward-only.  It binds PR #41's complete answering
// wire and literal sampling mapping, then delegates unchanged historical
// receipt gates through a private v2 compatibility view.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { buildRegistry, INPUT_MODE, SAMPLING, WIRE_COMMIT, WIRE_SOURCES, sha256 } = require("./build-sampling-wire-prompt-digest-registry-v4");
const { stable } = require("./validate-equal-budget-slots-v1");
const { validateEnvelope: validateV2 } = require("./validate-receipt-intake-v2");
const root = __dirname;
const isHash = x => typeof x === "string" && /^[0-9a-f]{64}$/.test(x);
const clone = x => JSON.parse(JSON.stringify(x));
const fail = x => { throw new Error(`receipt-intake-v4: ${x}`); };
const required = (x, keys, label) => keys.forEach(k => { if (!Object.prototype.hasOwnProperty.call(x || {}, k)) fail(`${label}.${k} is required`); });
function exactSampling(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || stable(Object.keys(value).sort()) !== stable(SAMPLING.keys)) fail("run.sampling must contain exactly temperature and top_p");
  for (const key of SAMPLING.keys) if (!Number.isFinite(value[key]) || value[key] < SAMPLING[key].minimum || value[key] > SAMPLING[key].maximum) fail(`run.sampling.${key} is outside its registered bound`);
}
async function trustedInputs(override) {
  const registry = override || JSON.parse(fs.readFileSync(path.join(root, "sampling-wire-assembled-prompt-digest-registry-v4.json"), "utf8"));
  required(registry, ["protocol_version", "source_commit", "dataset", "slot_registration", "trusted_proof_digest_registry", "no_live_assembler", "wire", "case_prompt_digests", "registry_sha256"], "sampling wire registry");
  if (registry.protocol_version !== "sampling-wire-assembled-prompt-digest-registry-v4" || registry.source_commit !== WIRE_COMMIT || !registry.wire || registry.wire.pr_merge_commit !== WIRE_COMMIT || registry.wire.input_mode !== INPUT_MODE || stable(registry.wire.source_sha256) !== stable(WIRE_SOURCES) || stable(registry.wire.sampling) !== stable(SAMPLING)) fail("PR #41 wire or sampling binding mismatch");
  const ids = registry.wire.template_identities;
  if (!ids || !isHash(ids.base_prompt_sha256) || !isHash(ids.wrapper_prompt_sha256) || stable(ids) !== stable(registry.no_live_assembler.template_identities)) fail("literal wire template identity mismatch");
  const { registry_sha256, ...payload } = registry;
  if (!isHash(registry_sha256) || registry_sha256 !== sha256(stable(payload))) fail("sampling wire registry self-hash mismatch");
  const rebuilt = await buildRegistry();
  if (stable(registry) !== stable(rebuilt)) fail("sampling wire registry does not reproduce from sealed assembler and PR #41 sources");
  return registry;
}
function legacyView(envelope) {
  const v2 = clone(envelope); v2.schema_version = "cognitive-proof-eval-receipt-intake-v2";
  // v2's sealed offline registry is retained only to execute its historical
  // record/artifact gates; v4's public envelope stays bound to PR #41.
  v2.source_commit = "82bcc82fca8d8ebb2734e1006b754a6d4e31b4ac";
  v2.actual_prompt_digest_registry = { path: "actual-assembled-prompt-digest-registry-v1.json", sha256: "198bcd6ab78bcee84c3b3333ba88c6f38e0362dd398ba7e083370a2db8da5e05" };
  v2.run = { ...v2.run, base_prompt_sha256: "a".repeat(64), wrapper_prompt_sha256: "b".repeat(64) }; delete v2.run.input_mode;
  const binding = sha256(JSON.stringify(v2.run)); v2.records = v2.records.map(r => ({ ...r, run_binding_sha256: binding })); return v2;
}
async function validateEnvelope(envelope, options = {}) {
  required(envelope, ["schema_version", "kind", "source_commit", "dataset", "slot_registration", "trusted_proof_digest_registry", "sampling_wire_prompt_digest_registry", "run", "records"], "envelope");
  if (envelope.schema_version !== "cognitive-proof-eval-receipt-intake-v4" || !["synthetic_non_result", "candidate_live_receipt"].includes(envelope.kind)) fail("unsupported v4 schema version or kind");
  required(envelope.run, ["model", "adapter", "base_prompt_sha256", "wrapper_prompt_sha256", "input_mode", "sampling", "retry_policy"], "run"); exactSampling(envelope.run.sampling);
  const registry = await trustedInputs(options.registryOverride);
  if (envelope.sampling_wire_prompt_digest_registry.path !== "sampling-wire-assembled-prompt-digest-registry-v4.json" || envelope.sampling_wire_prompt_digest_registry.sha256 !== registry.registry_sha256 || envelope.source_commit !== registry.source_commit || envelope.dataset.sha256 !== registry.dataset.sha256 || envelope.slot_registration.sha256 !== registry.slot_registration.sha256 || envelope.trusted_proof_digest_registry.sha256 !== registry.trusted_proof_digest_registry.sha256) fail("immutable envelope binding mismatch");
  if (envelope.run.input_mode !== INPUT_MODE || stable({ base_prompt_sha256: envelope.run.base_prompt_sha256, wrapper_prompt_sha256: envelope.run.wrapper_prompt_sha256 }) !== stable(registry.wire.template_identities)) fail("run literal wire identity or input mode mismatch");
  const binding = sha256(JSON.stringify(envelope.run));
  for (const record of envelope.records || []) {
    if (!record || record.run_binding_sha256 !== binding) fail("record model/adapter/literal-wire/prompt/sampling/retry binding mismatch");
    if (!registry.case_prompt_digests[record.case_id] || record.prompt_sha256 !== registry.case_prompt_digests[record.case_id][record.condition]) fail("sealed prompt digest does not match registered case/condition");
  }
  const result = await validateV2(legacyView(envelope), { rawRoot: options.rawRoot });
  return { status: result.status.replace(/v3|candidate-integrity-valid-not-a-result|synthetic-valid-not-aggregable/g, x => x === "candidate-integrity-valid-not-a-result" ? "candidate-integrity-valid-not-a-result-v4" : x === "synthetic-valid-not-aggregable" ? "synthetic-valid-not-aggregable-v4" : x), records: result.records };
}
async function mustReject(fixture, mutate) { const x = clone(fixture); mutate(x); await assert.rejects(() => validateEnvelope(x), /receipt-intake-v4:|receipt-intake-v2:/); }
async function selfTest() {
  const fixture = JSON.parse(fs.readFileSync(path.join(root, "receipt-intake-v4.synthetic.json"), "utf8"));
  assert.equal((await validateEnvelope(fixture)).status, "synthetic-valid-not-aggregable-v4");
  await mustReject(fixture, x => { x.schema_version = "cognitive-proof-eval-receipt-intake-v3"; });
  await mustReject(fixture, x => { x.run.sampling.seed = 0; }); await mustReject(fixture, x => { delete x.run.sampling.top_p; }); await mustReject(fixture, x => { x.run.sampling.temperature = NaN; }); await mustReject(fixture, x => { x.run.sampling.temperature = 2.01; }); await mustReject(fixture, x => { x.run.sampling.top_p = -0.01; });
  await mustReject(fixture, x => { x.records[0].run_binding_sha256 = "f".repeat(64); }); await mustReject(fixture, x => { x.run.input_mode = "wrapper-added"; }); await mustReject(fixture, x => { [x.records[0].prompt_sha256, x.records[1].prompt_sha256] = [x.records[1].prompt_sha256, x.records[0].prompt_sha256]; });
  const sourceDrift = clone(await buildRegistry()); sourceDrift.wire.source_sha256["trusted-proof-live-candidate.js"] = "f".repeat(64); const { registry_sha256, ...payload } = sourceDrift; sourceDrift.registry_sha256 = sha256(stable(payload)); await assert.rejects(() => trustedInputs(sourceDrift), /PR #41 wire or sampling binding mismatch/);
  const wireDrift = clone(await buildRegistry()); wireDrift.wire.sampling.request_mapping.top_p = "wrong"; const { registry_sha256: h, ...p } = wireDrift; wireDrift.registry_sha256 = sha256(stable(p)); await assert.rejects(() => trustedInputs(wireDrift), /PR #41 wire or sampling binding mismatch/);
  return { status: "receipt-intake-v4-self-test-ok" };
}
if (require.main === module) { const a = process.argv.slice(2); (a.includes("--self-test") ? selfTest() : validateEnvelope(JSON.parse(fs.readFileSync(a[0] || path.join(root, "receipt-intake-v4.synthetic.json"), "utf8")))).then(x => console.log(JSON.stringify(x, null, 2))).catch(e => { console.error(e.stack || e); process.exitCode = 1; }); }
module.exports = { exactSampling, selfTest, trustedInputs, validateEnvelope };
