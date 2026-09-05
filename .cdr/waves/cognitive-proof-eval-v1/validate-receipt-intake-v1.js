#!/usr/bin/env node
"use strict";

// Stdlib-only integrity intake. It never calls a provider, model, or scorer.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const root = __dirname;
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const isHash = value => typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
const fail = message => { throw new Error(`receipt-intake-v1: ${message}`); };
const required = (object, keys, label) => keys.forEach(key => { if (!Object.prototype.hasOwnProperty.call(object || {}, key)) fail(`${label}.${key} is required`); });

function trustedInputs() {
  const manifest = fs.readFileSync(path.join(root, "manifest.md"), "utf8");
  const sourceCommit = (manifest.match(/Source implementation snapshot: `([0-9a-f]{40})`/) || [])[1];
  const dataset = fs.readFileSync(path.join(root, "dataset.json"), "utf8");
  const registration = JSON.parse(fs.readFileSync(path.join(root, "slot-registration-v1.json"), "utf8"));
  if (!sourceCommit) fail("trusted manifest source commit is unavailable");
  if (!isHash(registration.registration_sha256)) fail("trusted slot registration self-hash is unavailable");
  return { sourceCommit, datasetHash: sha256(dataset), registrationHash: registration.registration_sha256, cases: JSON.parse(dataset).cases, slots: registration.case_slots };
}
function findLeak(value, trail = "envelope") {
  if (typeof value === "string") return /hidden_answer_contract|expected_result|answer[ _-]?contract|forbidden_in_prompt/i.test(value) ? trail : null;
  if (!value || typeof value !== "object") return null;
  for (const [key, child] of Object.entries(value)) {
    if (/hidden_answer_contract|expected_result|answer[ _-]?contract|oracle/i.test(key)) return `${trail}.${key}`;
    const nested = findLeak(child, `${trail}.${key}`); if (nested) return nested;
  }
  return null;
}
function validateRawFile(record, rawRoot) {
  if (!rawRoot) fail(`${record.record_id}: --raw-root is required for a candidate receipt`);
  if (typeof record.raw.ref !== "string" || !record.raw.ref.startsWith("local://")) fail(`${record.record_id}: raw.ref must use local://`);
  const relative = record.raw.ref.slice(8);
  if (!relative || path.isAbsolute(relative) || relative.split("/").includes("..")) fail(`${record.record_id}: unsafe raw.ref`);
  const full = path.resolve(rawRoot, relative); const base = path.resolve(rawRoot) + path.sep;
  if (!full.startsWith(base) || !fs.existsSync(full)) fail(`${record.record_id}: local raw file is unavailable`);
  if (sha256(fs.readFileSync(full)) !== record.raw.sha256) fail(`${record.record_id}: raw SHA-256 mismatch`);
}
function validateRecord(record, inputs, envelope, rawRoot, seenRaw) {
  required(record, ["record_id", "case_id", "condition", "run_binding_sha256", "snapshot_sha256", "query_sha256", "slot_bytes", "trusted_proof_sha256", "raw", "usage", "scorer", "supersedes_record_id"], "record");
  required(record.raw, ["ref", "sha256"], `${record.record_id}.raw`); required(record.usage, ["measured_effective_context_budget", "provider_usage"], `${record.record_id}.usage`); required(record.scorer, ["decision", "contract_sha256"], `${record.record_id}.scorer`);
  if (![record.run_binding_sha256, record.snapshot_sha256, record.query_sha256, record.raw.sha256, record.scorer.contract_sha256].every(isHash)) fail(`${record.record_id}: malformed SHA-256`);
  if (record.run_binding_sha256 !== sha256(JSON.stringify(envelope.run))) fail(`${record.record_id}: model/adapter/prompt/sampling/retry binding mismatch`);
  if (!Number.isInteger(record.slot_bytes) || record.slot_bytes < 1 || !Number.isInteger(record.usage.measured_effective_context_budget) || record.usage.measured_effective_context_budget < 1) fail(`${record.record_id}: invalid slot/E`);
  if (!["P0", "P1"].includes(record.condition)) fail(`${record.record_id}: condition must be P0 or P1`);
  if (record.supersedes_record_id !== null) fail(`${record.record_id}: in-place overwrite/supersedes is forbidden`);
  if (record.condition === "P0" && record.trusted_proof_sha256 !== null) fail(`${record.record_id}: P0 must not bind a proof`);
  if (record.condition === "P1" && !isHash(record.trusted_proof_sha256)) fail(`${record.record_id}: P1 requires trusted proof SHA-256`);
  const fixture = inputs.cases.find(item => item.id === record.case_id);
  if (!fixture) fail(`${record.record_id}: unknown case binding`);
  if (record.snapshot_sha256 !== sha256(JSON.stringify(fixture.accepted_snapshot)) || record.query_sha256 !== sha256(JSON.stringify(fixture.query))) fail(`${record.record_id}: snapshot/query binding mismatch`);
  if (record.slot_bytes !== inputs.slots[record.case_id]) fail(`${record.record_id}: slot binding mismatch`);
  if (seenRaw.has(record.raw.ref)) fail(`${record.record_id}: raw output overwrite/duplicate reference`); seenRaw.add(record.raw.ref);
  if (envelope.kind === "candidate_live_receipt") validateRawFile(record, rawRoot);
}
function validateEnvelope(envelope, options = {}) {
  required(envelope, ["schema_version", "kind", "source_commit", "dataset", "slot_registration", "run", "records"], "envelope");
  if (envelope.schema_version !== "cognitive-proof-eval-receipt-intake-v1" || !["synthetic_non_result", "candidate_live_receipt"].includes(envelope.kind)) fail("unsupported schema version or kind");
  required(envelope.dataset, ["path", "sha256"], "dataset"); required(envelope.slot_registration, ["path", "sha256"], "slot_registration"); required(envelope.run, ["model", "adapter", "base_prompt_sha256", "wrapper_prompt_sha256", "sampling", "retry_policy"], "run");
  if (!Array.isArray(envelope.records) || !envelope.records.length || !isHash(envelope.run.base_prompt_sha256) || !isHash(envelope.run.wrapper_prompt_sha256)) fail("records or run prompt hashes are invalid");
  const leak = findLeak({ run: envelope.run, records: envelope.records }); if (leak) fail(`oracle/control leakage at ${leak}`);
  const inputs = trustedInputs();
  if (envelope.source_commit !== inputs.sourceCommit) fail("source commit binding mismatch");
  if (envelope.dataset.path !== "dataset.json" || envelope.dataset.sha256 !== inputs.datasetHash) fail("dataset binding mismatch");
  if (envelope.slot_registration.path !== "slot-registration-v1.json" || envelope.slot_registration.sha256 !== inputs.registrationHash) fail("slot registration binding mismatch");
  const recordIds = new Set(), pairs = new Map(), seenRaw = new Set();
  for (const record of envelope.records) {
    if (recordIds.has(record.record_id)) fail(`duplicate record_id ${record.record_id}`); recordIds.add(record.record_id);
    validateRecord(record, inputs, envelope, options.rawRoot, seenRaw);
    const key = `${record.case_id}:${record.condition}`; if (pairs.has(key)) fail(`duplicate condition record ${key}`); pairs.set(key, record);
  }
  for (const caseId of Object.keys(inputs.slots)) {
    const p0 = pairs.get(`${caseId}:P0`), p1 = pairs.get(`${caseId}:P1`);
    if (envelope.kind === "candidate_live_receipt" && (!p0 || !p1)) fail(`missing P0/P1 record for ${caseId}`);
    if (p0 && p1) {
      if (p0.usage.measured_effective_context_budget !== p1.usage.measured_effective_context_budget) fail(`${caseId}: unequal measured E`);
      for (const field of ["run_binding_sha256", "snapshot_sha256", "query_sha256", "slot_bytes"]) if (p0[field] !== p1[field]) fail(`${caseId}: unequal immutable pair binding ${field}`);
    }
  }
  return { status: envelope.kind === "synthetic_non_result" ? "synthetic-valid-not-aggregable" : "candidate-integrity-valid-not-a-result", records: envelope.records.length };
}
const cloned = value => JSON.parse(JSON.stringify(value));
function mustReject(name, fixture, mutate, options) { const x = cloned(fixture); mutate(x); assert.throws(() => validateEnvelope(x, options), /receipt-intake-v1:/, name); }
function selfTest() {
  const fixture = JSON.parse(fs.readFileSync(path.join(root, "receipt-intake-v1.synthetic.json"), "utf8")); assert.equal(validateEnvelope(fixture).status, "synthetic-valid-not-aggregable");
  mustReject("missing condition", fixture, x => { x.kind = "candidate_live_receipt"; }, {});
  mustReject("duplicate", fixture, x => x.records.push(cloned(x.records[0]))); mustReject("wrong binding", fixture, x => { x.source_commit = "0".repeat(40); });
  mustReject("unequal E", fixture, x => { x.records[1].usage.measured_effective_context_budget = 1025; }); mustReject("run binding", fixture, x => { x.records[1].run_binding_sha256 = "d".repeat(64); }); mustReject("oracle leak", fixture, x => { x.records[0].scorer.hidden_answer_contract = "leak"; }); mustReject("overwrite", fixture, x => { x.records[1].supersedes_record_id = "old"; });
  const rawRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cdr-intake-")); try { const record = cloned(fixture.records[0]); record.raw.ref = "local://raw.txt"; fs.writeFileSync(path.join(rawRoot, "raw.txt"), "different bytes"); assert.throws(() => validateRawFile(record, rawRoot), /raw SHA-256 mismatch/, "wrong raw hash"); } finally { fs.rmSync(rawRoot, { recursive: true, force: true }); }
  return { status: "receipt-intake-v1-self-test-ok" };
}
if (require.main === module) { const args = process.argv.slice(2); if (args.includes("--self-test")) console.log(JSON.stringify(selfTest())); else { const i = args.indexOf("--raw-root"); console.log(JSON.stringify(validateEnvelope(JSON.parse(fs.readFileSync(args[0] || path.join(root, "receipt-intake-v1.synthetic.json"), "utf8")), { rawRoot: i < 0 ? undefined : args[i + 1] }), null, 2)); } }
module.exports = { validateEnvelope, validateRawFile, selfTest };
