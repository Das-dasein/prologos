#!/usr/bin/env node
"use strict";

// V3 is deliberately forward-only.  It validates the real PR #37 wire
// identity before delegating the unchanged P0/P1, raw-root and leakage gates
// to the historical v2 gate implementation with an internal compatibility
// view; no v1/v2 envelope is accepted as a v3 input.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { buildRegistry, INPUT_MODE, TRANSPORT_COMMIT, TRANSPORT_SOURCES, sha256 } = require("./build-wire-prompt-digest-registry-v3");
const { stable } = require("./validate-equal-budget-slots-v1");
const { validateEnvelope: validateV2 } = require("./validate-receipt-intake-v2");
const root = __dirname;
const isHash = value => typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
const fail = message => { throw new Error(`receipt-intake-v3: ${message}`); };
const clone = value => JSON.parse(JSON.stringify(value));
const required = (object, keys, label) => keys.forEach(key => { if (!Object.prototype.hasOwnProperty.call(object || {}, key)) fail(`${label}.${key} is required`); });

async function trustedInputs(registryOverride) {
  const actual = registryOverride || JSON.parse(fs.readFileSync(path.join(root, "wire-assembled-prompt-digest-registry-v3.json"), "utf8"));
  required(actual, ["protocol_version", "source_commit", "dataset", "slot_registration", "trusted_proof_digest_registry", "no_live_assembler", "wire_transport", "case_prompt_digests", "registry_sha256"], "wire prompt digest registry");
  if (actual.protocol_version !== "wire-assembled-prompt-digest-registry-v3" || !actual.wire_transport || actual.wire_transport.source_commit !== TRANSPORT_COMMIT || actual.wire_transport.input_mode !== INPUT_MODE || stable(actual.wire_transport.source_sha256) !== stable(TRANSPORT_SOURCES)) fail("wire transport binding mismatch");
  const ids = actual.wire_transport.template_identities;
  if (!ids || !isHash(ids.base_prompt_sha256) || !isHash(ids.wrapper_prompt_sha256) || stable(ids) !== stable(actual.no_live_assembler.template_identities)) fail("real wire template identity mismatch");
  const { registry_sha256, ...payload } = actual;
  if (!isHash(registry_sha256) || registry_sha256 !== sha256(stable(payload))) fail("wire prompt digest registry self-hash mismatch");
  const rebuilt = await buildRegistry();
  if (stable(actual) !== stable(rebuilt)) fail("wire prompt digest registry does not reproduce from sealed assembler and pinned transport");
  return actual;
}

function legacyView(envelope) {
  const v2 = clone(envelope);
  v2.schema_version = "cognitive-proof-eval-receipt-intake-v2";
  v2.actual_prompt_digest_registry = { path: "actual-assembled-prompt-digest-registry-v1.json", sha256: "198bcd6ab78bcee84c3b3333ba88c6f38e0362dd398ba7e083370a2db8da5e05" };
  v2.run = { ...v2.run, base_prompt_sha256: "a".repeat(64), wrapper_prompt_sha256: "b".repeat(64) };
  delete v2.run.input_mode;
  const binding = crypto.createHash("sha256").update(JSON.stringify(v2.run)).digest("hex");
  v2.records = v2.records.map(record => ({ ...record, run_binding_sha256: binding }));
  return v2;
}

async function validateEnvelope(envelope, options = {}) {
  required(envelope, ["schema_version", "kind", "source_commit", "dataset", "slot_registration", "trusted_proof_digest_registry", "wire_prompt_digest_registry", "run", "records"], "envelope");
  if (envelope.schema_version !== "cognitive-proof-eval-receipt-intake-v3" || !["synthetic_non_result", "candidate_live_receipt"].includes(envelope.kind)) fail("unsupported v3 schema version or kind");
  required(envelope.run, ["model", "adapter", "base_prompt_sha256", "wrapper_prompt_sha256", "input_mode", "sampling", "retry_policy"], "run");
  const registry = await trustedInputs(options.registryOverride);
  if (envelope.wire_prompt_digest_registry.path !== "wire-assembled-prompt-digest-registry-v3.json" || envelope.wire_prompt_digest_registry.sha256 !== registry.registry_sha256 || envelope.source_commit !== registry.source_commit || envelope.dataset.sha256 !== registry.dataset.sha256 || envelope.slot_registration.sha256 !== registry.slot_registration.sha256 || envelope.trusted_proof_digest_registry.sha256 !== registry.trusted_proof_digest_registry.sha256) fail("immutable envelope binding mismatch");
  if (envelope.run.input_mode !== INPUT_MODE || stable({ base_prompt_sha256: envelope.run.base_prompt_sha256, wrapper_prompt_sha256: envelope.run.wrapper_prompt_sha256 }) !== stable(registry.wire_transport.template_identities)) fail("run real wire identity or input mode mismatch");
  const runBinding = crypto.createHash("sha256").update(JSON.stringify(envelope.run)).digest("hex");
  for (const record of envelope.records || []) {
    if (!record || record.run_binding_sha256 !== runBinding) fail("record model/adapter/real-wire/prompt/sampling/retry binding mismatch");
    if (!record || !registry.case_prompt_digests[record.case_id] || record.prompt_sha256 !== registry.case_prompt_digests[record.case_id][record.condition]) fail("actual wire prompt digest does not match registered case/condition");
  }
  const v2result = await validateV2(legacyView(envelope), { rawRoot: options.rawRoot });
  return { status: v2result.status.replace("candidate-integrity-valid-not-a-result", "candidate-integrity-valid-not-a-result-v3").replace("synthetic-valid-not-aggregable", "synthetic-valid-not-aggregable-v3"), records: v2result.records };
}

async function mustReject(fixture, mutate, options) { const x = clone(fixture); mutate(x); await assert.rejects(() => validateEnvelope(x, options), /receipt-intake-v3:|receipt-intake-v2:/); }
async function selfTest() {
  const fixture = JSON.parse(fs.readFileSync(path.join(root, "receipt-intake-v3.synthetic.json"), "utf8"));
  assert.equal((await validateEnvelope(fixture)).status, "synthetic-valid-not-aggregable-v3");
  await mustReject(fixture, x => { x.schema_version = "cognitive-proof-eval-receipt-intake-v2"; });
  await mustReject(fixture, x => { x.run.base_prompt_sha256 = "a".repeat(64); });
  await mustReject(fixture, x => { x.run.base_prompt_sha256 = "f".repeat(64); });
  await mustReject(fixture, x => { x.run.input_mode = "wrapper-added"; });
  await mustReject(fixture, x => { x.records[0].run_binding_sha256 = "f".repeat(64); });
  await mustReject(fixture, x => { x.wire_prompt_digest_registry.sha256 = "f".repeat(64); });
  const changedSource = clone(await buildRegistry()); changedSource.wire_transport.source_sha256["providers/openai-answering.js"] = "f".repeat(64); const { registry_sha256, ...changedPayload } = changedSource; changedSource.registry_sha256 = sha256(stable(changedPayload)); await assert.rejects(() => trustedInputs(changedSource), /wire transport binding mismatch/);
  const changedCommit = clone(await buildRegistry()); changedCommit.wire_transport.source_commit = "f".repeat(40); const { registry_sha256: changedCommitHash, ...changedCommitPayload } = changedCommit; changedCommit.registry_sha256 = sha256(stable(changedCommitPayload)); await assert.rejects(() => trustedInputs(changedCommit), /wire transport binding mismatch/);
  const badTransport = clone(await buildRegistry()); badTransport.wire_transport.input_mode = "changed"; await assert.rejects(() => trustedInputs(badTransport), /wire transport binding mismatch/); const badSelfHash = clone(await buildRegistry()); badSelfHash.case_prompt_digests.multi_hop_01.P0 = "f".repeat(64); await assert.rejects(() => trustedInputs(badSelfHash), /self-hash mismatch/);
  await mustReject(fixture, x => { [x.records[0].prompt_sha256, x.records[1].prompt_sha256] = [x.records[1].prompt_sha256, x.records[0].prompt_sha256]; });
  const rawRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cdr-intake-v3-")); try { const candidate = clone(fixture); candidate.kind = "candidate_live_receipt"; const p = candidate.records[0]; fs.mkdirSync(path.join(rawRoot, "synthetic")); fs.writeFileSync(path.join(rawRoot, "synthetic/non-result-p0.prompt"), "changed"); fs.writeFileSync(path.join(rawRoot, "synthetic/non-result-p0.raw"), "raw"); p.prompt.ref = "local://synthetic/non-result-p0.prompt"; p.prompt.sha256 = sha256("changed"); p.raw.ref = "local://synthetic/non-result-p0.raw"; p.raw.sha256 = sha256("raw"); await mustReject(candidate, x => x, { rawRoot }); } finally { fs.rmSync(rawRoot, { recursive: true, force: true }); }
  return { status: "receipt-intake-v3-self-test-ok" };
}
if (require.main === module) { const args = process.argv.slice(2), i = args.indexOf("--raw-root"); (args.includes("--self-test") ? selfTest() : validateEnvelope(JSON.parse(fs.readFileSync(args[0] || path.join(root, "receipt-intake-v3.synthetic.json"), "utf8")), { rawRoot: i < 0 ? undefined : args[i + 1] })).then(value => console.log(JSON.stringify(value, null, 2))).catch(error => { console.error(error.stack || error); process.exitCode = 1; }); }
module.exports = { selfTest, trustedInputs, validateEnvelope };
