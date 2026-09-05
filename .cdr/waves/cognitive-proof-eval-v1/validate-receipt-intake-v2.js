#!/usr/bin/env node
"use strict";

// Stdlib-only v2 intake.  It is deliberately separate from v1: a v1
// envelope is not upgraded or reinterpreted here.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { buildRegistry, sha256 } = require("./build-actual-prompt-digest-registry-v1");
const { stable } = require("./validate-equal-budget-slots-v1");
const root = __dirname;
const isHash = value => typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
const fail = message => { throw new Error(`receipt-intake-v2: ${message}`); };
const required = (object, keys, label) => keys.forEach(key => { if (!Object.prototype.hasOwnProperty.call(object || {}, key)) fail(`${label}.${key} is required`); });
const cloned = value => JSON.parse(JSON.stringify(value));

function safeLocalFile(record, field, rawRoot) {
  const artifact = record[field];
  required(artifact, ["ref", "sha256"], `${record.record_id}.${field}`);
  if (!isHash(artifact.sha256) || typeof artifact.ref !== "string" || !artifact.ref.startsWith("local://")) fail(`${record.record_id}: ${field} must have local ref and SHA-256`);
  const relative = artifact.ref.slice(8);
  if (!rawRoot) fail(`${record.record_id}: --raw-root is required for a candidate receipt`);
  if (!relative || path.isAbsolute(relative) || relative.split("/").includes("..")) fail(`${record.record_id}: unsafe ${field}.ref`);
  const full = path.resolve(rawRoot, relative), base = `${path.resolve(rawRoot)}${path.sep}`;
  if (!full.startsWith(base) || !fs.existsSync(full)) fail(`${record.record_id}: local ${field} file is unavailable`);
  if (sha256(fs.readFileSync(full)) !== artifact.sha256) fail(`${record.record_id}: ${field} artifact SHA-256 mismatch`);
}

async function trustedInputs(registryOverride) {
  const manifest = fs.readFileSync(path.join(root, "manifest.md"), "utf8");
  const sourceCommit = (manifest.match(/Source implementation snapshot: `([0-9a-f]{40})`/) || [])[1];
  const dataset = fs.readFileSync(path.join(root, "dataset.json"), "utf8"), cases = JSON.parse(dataset).cases;
  const registration = JSON.parse(fs.readFileSync(path.join(root, "slot-registration-v1.json"), "utf8"));
  const proofRegistry = JSON.parse(fs.readFileSync(path.join(root, "trusted-proof-digest-registry-v1.json"), "utf8"));
  const promptRegistry = registryOverride || JSON.parse(fs.readFileSync(path.join(root, "actual-assembled-prompt-digest-registry-v1.json"), "utf8"));
  const datasetHash = sha256(dataset);
  required(promptRegistry, ["protocol_version", "source_commit", "dataset", "slot_registration", "trusted_proof_digest_registry", "no_live_assembler", "case_prompt_digests", "registry_sha256"], "actual prompt digest registry");
  if (JSON.stringify(Object.keys(promptRegistry).sort()) !== JSON.stringify(["case_prompt_digests", "dataset", "no_live_assembler", "protocol_version", "registry_sha256", "slot_registration", "source_commit", "trusted_proof_digest_registry"])) fail("actual prompt digest registry fields mismatch");
  if (promptRegistry.protocol_version !== "actual-assembled-prompt-digest-registry-v1" || promptRegistry.source_commit !== sourceCommit || promptRegistry.dataset.path !== "dataset.json" || promptRegistry.dataset.sha256 !== datasetHash || promptRegistry.slot_registration.path !== "slot-registration-v1.json" || promptRegistry.slot_registration.sha256 !== registration.registration_sha256 || promptRegistry.trusted_proof_digest_registry.path !== "trusted-proof-digest-registry-v1.json" || promptRegistry.trusted_proof_digest_registry.sha256 !== proofRegistry.registry_sha256 || !promptRegistry.no_live_assembler || promptRegistry.no_live_assembler.path !== "trusted-proof-preflight.js" || !isHash(promptRegistry.no_live_assembler.template_identities && promptRegistry.no_live_assembler.template_identities.base_prompt_sha256) || !isHash(promptRegistry.no_live_assembler.template_identities && promptRegistry.no_live_assembler.template_identities.wrapper_prompt_sha256)) fail("actual prompt digest registry binding mismatch");
  const registryPayload = { protocol_version: promptRegistry.protocol_version, source_commit: promptRegistry.source_commit, dataset: promptRegistry.dataset, slot_registration: promptRegistry.slot_registration, trusted_proof_digest_registry: promptRegistry.trusted_proof_digest_registry, no_live_assembler: promptRegistry.no_live_assembler, case_prompt_digests: promptRegistry.case_prompt_digests };
  if (!isHash(promptRegistry.registry_sha256) || promptRegistry.registry_sha256 !== sha256(stable(registryPayload))) fail("actual prompt digest registry self-hash mismatch");
  const ids = cases.map(item => item.id).sort();
  if (JSON.stringify(Object.keys(promptRegistry.case_prompt_digests || {}).sort()) !== JSON.stringify(ids) || !Object.values(promptRegistry.case_prompt_digests).every(value => value && isHash(value.P0) && isHash(value.P1) && Object.keys(value).length === 2)) fail("actual prompt digest registry case mapping mismatch");
  const rebuilt = await buildRegistry();
  if (stable(rebuilt) !== stable(promptRegistry)) fail("actual prompt digest registry does not reproduce from no-live assembler");
  return { sourceCommit, datasetHash, registrationHash: registration.registration_sha256, proofRegistryHash: proofRegistry.registry_sha256, promptRegistryHash: promptRegistry.registry_sha256, promptDigests: promptRegistry.case_prompt_digests, proofDigests: proofRegistry.case_digests, cases, slots: registration.case_slots, templateIdentities: promptRegistry.no_live_assembler.template_identities };
}
function findLeak(value, trail = "envelope") { if (typeof value === "string") return /hidden_answer_contract|expected_result|answer[ _-]?contract|forbidden_in_prompt/i.test(value) ? trail : null; if (!value || typeof value !== "object") return null; for (const [key, child] of Object.entries(value)) { if (/hidden_answer_contract|expected_result|answer[ _-]?contract|oracle/i.test(key)) return `${trail}.${key}`; const nested = findLeak(child, `${trail}.${key}`); if (nested) return nested; } return null; }
function validateRecord(record, inputs, envelope, rawRoot, seenRefs) {
  required(record, ["record_id", "case_id", "condition", "run_binding_sha256", "snapshot_sha256", "query_sha256", "slot_bytes", "trusted_proof_sha256", "prompt_sha256", "prompt", "raw", "usage", "scorer", "supersedes_record_id"], "record");
  required(record.usage, ["measured_effective_context_budget", "provider_usage"], `${record.record_id}.usage`); required(record.scorer, ["decision", "contract_sha256"], `${record.record_id}.scorer`);
  if (![record.run_binding_sha256, record.snapshot_sha256, record.query_sha256, record.prompt_sha256, record.scorer.contract_sha256].every(isHash)) fail(`${record.record_id}: malformed SHA-256`);
  if (record.run_binding_sha256 !== sha256(JSON.stringify(envelope.run))) fail(`${record.record_id}: model/adapter/prompt/sampling/retry binding mismatch`);
  if (!["P0", "P1"].includes(record.condition) || !Number.isInteger(record.slot_bytes) || record.slot_bytes < 1 || !Number.isInteger(record.usage.measured_effective_context_budget) || record.usage.measured_effective_context_budget < 1) fail(`${record.record_id}: invalid condition, slot, or E`);
  if (record.supersedes_record_id !== null) fail(`${record.record_id}: in-place overwrite/supersedes is forbidden`);
  const fixture = inputs.cases.find(item => item.id === record.case_id); if (!fixture) fail(`${record.record_id}: unknown case binding`);
  if (record.snapshot_sha256 !== sha256(JSON.stringify(fixture.accepted_snapshot)) || record.query_sha256 !== sha256(JSON.stringify(fixture.query)) || record.slot_bytes !== inputs.slots[record.case_id]) fail(`${record.record_id}: snapshot/query/slot binding mismatch`);
  if (record.condition === "P0" ? record.trusted_proof_sha256 !== null : !isHash(record.trusted_proof_sha256) || record.trusted_proof_sha256 !== inputs.proofDigests[record.case_id]) fail(`${record.record_id}: condition-specific trusted proof binding mismatch`);
  if (record.prompt_sha256 !== inputs.promptDigests[record.case_id][record.condition]) fail(`${record.record_id}: actual prompt digest does not match registered case/condition`);
  for (const field of ["prompt", "raw"]) { if (seenRefs.has(record[field].ref)) fail(`${record.record_id}: ${field} overwrite/duplicate reference`); seenRefs.add(record[field].ref); }
  if (envelope.kind === "candidate_live_receipt") { safeLocalFile(record, "prompt", rawRoot); safeLocalFile(record, "raw", rawRoot); if (record.prompt.sha256 !== record.prompt_sha256) fail(`${record.record_id}: prompt artifact does not equal record prompt SHA-256`); }
}
async function validateEnvelope(envelope, options = {}) {
  required(envelope, ["schema_version", "kind", "source_commit", "dataset", "slot_registration", "trusted_proof_digest_registry", "actual_prompt_digest_registry", "run", "records"], "envelope");
  if (envelope.schema_version !== "cognitive-proof-eval-receipt-intake-v2" || !["synthetic_non_result", "candidate_live_receipt"].includes(envelope.kind)) fail("unsupported v2 schema version or kind");
  required(envelope.dataset, ["path", "sha256"], "dataset"); required(envelope.slot_registration, ["path", "sha256"], "slot_registration"); required(envelope.trusted_proof_digest_registry, ["path", "sha256"], "trusted_proof_digest_registry"); required(envelope.actual_prompt_digest_registry, ["path", "sha256"], "actual_prompt_digest_registry"); required(envelope.run, ["model", "adapter", "base_prompt_sha256", "wrapper_prompt_sha256", "sampling", "retry_policy"], "run");
  if (!Array.isArray(envelope.records) || !envelope.records.length || !isHash(envelope.run.base_prompt_sha256) || !isHash(envelope.run.wrapper_prompt_sha256)) fail("records or run prompt hashes are invalid"); const leak = findLeak({ run: envelope.run, records: envelope.records }); if (leak) fail(`oracle/control leakage at ${leak}`);
  const inputs = await trustedInputs(options.registryOverride);
  if (envelope.source_commit !== inputs.sourceCommit || envelope.dataset.path !== "dataset.json" || envelope.dataset.sha256 !== inputs.datasetHash || envelope.slot_registration.sha256 !== inputs.registrationHash || envelope.trusted_proof_digest_registry.sha256 !== inputs.proofRegistryHash || envelope.actual_prompt_digest_registry.path !== "actual-assembled-prompt-digest-registry-v1.json" || envelope.actual_prompt_digest_registry.sha256 !== inputs.promptRegistryHash) fail("immutable envelope binding mismatch");
  if (envelope.run.base_prompt_sha256 !== inputs.templateIdentities.base_prompt_sha256 || envelope.run.wrapper_prompt_sha256 !== inputs.templateIdentities.wrapper_prompt_sha256) fail("run template identity mismatch");
  const ids = new Set(), pairs = new Map(), refs = new Set(); for (const record of envelope.records) { if (ids.has(record.record_id)) fail(`duplicate record_id ${record.record_id}`); ids.add(record.record_id); validateRecord(record, inputs, envelope, options.rawRoot, refs); const key = `${record.case_id}:${record.condition}`; if (pairs.has(key)) fail(`duplicate condition record ${key}`); pairs.set(key, record); }
  for (const caseId of Object.keys(inputs.slots)) { const p0 = pairs.get(`${caseId}:P0`), p1 = pairs.get(`${caseId}:P1`); if (envelope.kind === "candidate_live_receipt" && (!p0 || !p1)) fail(`missing P0/P1 record for ${caseId}`); if (p0 && p1 && (p0.usage.measured_effective_context_budget !== p1.usage.measured_effective_context_budget || ["run_binding_sha256", "snapshot_sha256", "query_sha256", "slot_bytes"].some(field => p0[field] !== p1[field]))) fail(`${caseId}: unequal P0/P1 immutable binding or E`); }
  return { status: envelope.kind === "synthetic_non_result" ? "synthetic-valid-not-aggregable" : "candidate-integrity-valid-not-a-result", records: envelope.records.length };
}
async function mustReject(name, fixture, mutate, options) { const x = cloned(fixture); mutate(x); await assert.rejects(() => validateEnvelope(x, options), /receipt-intake-v2:/, name); }
async function selfTest() {
  const fixture = JSON.parse(fs.readFileSync(path.join(root, "receipt-intake-v2.synthetic.json"), "utf8")); assert.equal((await validateEnvelope(fixture)).status, "synthetic-valid-not-aggregable");
  await mustReject("wrong valid prompt hash", fixture, x => { x.records[0].prompt_sha256 = "f".repeat(64); }); await mustReject("P0/P1 swap", fixture, x => { [x.records[0].prompt_sha256, x.records[1].prompt_sha256] = [x.records[1].prompt_sha256, x.records[0].prompt_sha256]; }); await mustReject("v1 rejected", fixture, x => { x.schema_version = "cognitive-proof-eval-receipt-intake-v1"; });
  const tampered = await buildRegistry(); tampered.case_prompt_digests.multi_hop_01.P0 = "f".repeat(64); await assert.rejects(() => trustedInputs(tampered), /receipt-intake-v2: actual prompt digest registry self-hash mismatch/, "registry self-hash tamper"); const bindingTamper = await buildRegistry(); bindingTamper.dataset.sha256 = "f".repeat(64); const { registry_sha256, ...bindingPayload } = bindingTamper; bindingTamper.registry_sha256 = sha256(stable(bindingPayload)); await assert.rejects(() => trustedInputs(bindingTamper), /receipt-intake-v2: actual prompt digest registry binding mismatch/, "registry binding tamper");
  const rawRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cdr-intake-v2-")); try { const candidate = cloned(fixture); candidate.kind = "candidate_live_receipt"; const p = candidate.records[0]; fs.mkdirSync(path.join(rawRoot, "synthetic")); fs.writeFileSync(path.join(rawRoot, "synthetic/non-result-p0.prompt"), "changed outside slot"); fs.writeFileSync(path.join(rawRoot, "synthetic/non-result-p0.raw"), "raw"); p.prompt.ref = "local://synthetic/non-result-p0.prompt"; p.prompt.sha256 = sha256("changed outside slot"); p.prompt_sha256 = p.prompt.sha256; p.raw.ref = "local://synthetic/non-result-p0.raw"; p.raw.sha256 = sha256("raw"); await assert.rejects(() => validateEnvelope(candidate, { rawRoot }), /actual prompt digest does not match/, "outside-slot prompt change"); p.prompt_sha256 = fixture.records[0].prompt_sha256; p.prompt.sha256 = fixture.records[0].prompt_sha256; await assert.rejects(() => validateEnvelope(candidate, { rawRoot }), /prompt artifact SHA-256 mismatch/, "prompt artifact mismatch"); } finally { fs.rmSync(rawRoot, { recursive: true, force: true }); }
  return { status: "receipt-intake-v2-self-test-ok" };
}
if (require.main === module) { const args = process.argv.slice(2), i = args.indexOf("--raw-root"); (args.includes("--self-test") ? selfTest() : validateEnvelope(JSON.parse(fs.readFileSync(args[0] || path.join(root, "receipt-intake-v2.synthetic.json"), "utf8")), { rawRoot: i < 0 ? undefined : args[i + 1] })).then(result => console.log(JSON.stringify(result, null, 2))).catch(error => { console.error(error.stack || error); process.exitCode = 1; }); }
module.exports = { selfTest, trustedInputs, validateEnvelope };
