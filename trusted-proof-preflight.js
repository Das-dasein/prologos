"use strict";

// No provider SDK is imported here.  This is a deterministic harness boundary:
// a caller may inject a fake transport for tests, while a real transport is
// deliberately outside this alpha implementation.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { createSnapshot, runTrustedQuery } = require("./cognitive-memory");
const { assembleCase, stable, validateSlotRegistration } = require("./.cdr/waves/cognitive-proof-eval-v1/validate-equal-budget-slots-v1");

const WAVE = path.join(__dirname, ".cdr/waves/cognitive-proof-eval-v1");
const FORBIDDEN = ["hidden_answer_contract", "expected_result", "categories", "registration_sha256", "case_slots"];
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const canonical = value => stable(value);
const readJson = file => JSON.parse(fs.readFileSync(file, "utf8"));
const fileHash = file => sha256(fs.readFileSync(file));
// This is intentionally module-private.  It binds the exact assembly object to
// the slot generated from its trusted result; public fields are conveniences,
// never transport authority.
const assemblyProvenance = new WeakMap();

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) deepFreeze(value[key], seen);
  return Object.freeze(value);
}

function copy(value) { return structuredClone(value); }

function immutableInputs({ datasetPath = path.join(WAVE, "dataset.json"), registrationPath = path.join(WAVE, "slot-registration-v1.json") } = {}) {
  const dataset = readJson(datasetPath), registration = readJson(registrationPath);
  const binding = validateSlotRegistration(dataset, registration);
  return Object.freeze({ dataset, registration, binding, dataset_sha256: fileHash(datasetPath), registration_sha256: fileHash(registrationPath), dataset_path: path.resolve(datasetPath), registration_path: path.resolve(registrationPath) });
}

function requireText(value, label) { if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be non-empty text`); return value; }
function canonicalRetryPolicy(value) {
  requireText(value, "config.retry_policy");
  if (value !== value.trim() || !/^[a-z0-9][a-z0-9._:-]*$/.test(value)) throw new Error("config.retry_policy must be canonical non-empty text");
  return value;
}
function requireImmutableConfig(config, inputs) {
  if (!config || typeof config !== "object") throw new Error("immutable live config is required");
  for (const key of ["source_commit", "model", "base_prompt_sha256", "wrapper_prompt_sha256"]) requireText(config[key], `config.${key}`);
  if (!/^[0-9a-f]{40}$/.test(config.source_commit)) throw new Error("config.source_commit must be a 40-hex immutable commit");
  if (!config.sampling || typeof config.sampling !== "object") throw new Error("config.sampling is required");
  const retry_policy = canonicalRetryPolicy(config.retry_policy);
  if (config.dataset_sha256 !== inputs.dataset_sha256 || config.slot_registration_file_sha256 !== inputs.registration_sha256 || config.slot_registration_sha256 !== inputs.binding.slot_registration_sha256) throw new Error("immutable config does not bind dataset/slot registration");
  return Object.freeze({ ...config, retry_policy, sampling: Object.freeze({ ...config.sampling }) });
}

function oracleValues(fixture) {
  if (!fixture || !fixture.hidden_answer_contract || typeof fixture.hidden_answer_contract.allowed !== "string") throw new Error("immutable fixture hidden answer contract is required for leak guard");
  return [fixture.hidden_answer_contract.allowed, stable(fixture.expected_result)];
}

function leakGuard({ prompt, condition, slotStart, slotEnd, fixture, trusted_result, pair }) {
  requireText(prompt, "assembled prompt");
  const start = Number.isInteger(slotStart) ? slotStart : -1, end = Number.isInteger(slotEnd) ? slotEnd : -1;
  if (start < 0 || end < start || end > prompt.length) throw new Error("leak guard requires declared evidence-slot boundaries");
  for (const field of FORBIDDEN) if (prompt.includes(field)) throw new Error(`oracle leakage rejected before provider call: ${field}`);
  const slot = prompt.slice(start, end);
  const outsideSlot = `${prompt.slice(0, start)}${prompt.slice(end)}`;
  const values = oracleValues(fixture);
  for (const value of values) {
    if (outsideSlot.includes(value)) throw new Error("oracle leakage rejected before provider call: immutable oracle value outside declared slot");
    if (condition === "P0" && slot.includes(value)) throw new Error("oracle leakage rejected before provider call: immutable oracle value in P0");
  }
  if (condition === "P0" && !/^~+$/.test(slot)) throw new Error("P0 control slot must be neutral");
  if (condition !== "P1" && condition !== "PX" && !/^~+$/.test(slot)) throw new Error("only P1/PX may carry trusted evidence");
  if ((condition === "P1" || condition === "PX") && (!pair || !trusted_result || slot !== pair.p1Slot)) throw new Error("P1/PX trusted evidence must be the exact trusted serialization in the declared slot");
  return true;
}

function promptFor(pair, condition, transcript = null) {
  const slot = condition === "P0" ? pair.p0Slot : pair.p1Slot;
  const prefix = `${pair.prefix}TRUST_BOUNDARY=accepted_snapshot_and_p1_evidence_are_trusted;_px_transcript_is_untrusted\n`;
  const suffix = `${pair.suffix}${condition === "PX" ? `UNTRUSTED_EXPLORATORY_TRANSCRIPT=${transcript || ""}\n` : ""}`;
  const prompt = `${prefix}${slot}${suffix}`;
  return { prompt, slotStart: prefix.length, slotEnd: prefix.length + slot.length };
}

function equalityDigest({ config, inputs, snapshot, query, slotBytes, measuredE }) {
  if (!Number.isSafeInteger(measuredE) || measuredE < 0) throw new Error("measured effective E must be a non-negative integer from the injected provider/token counter");
  return sha256(canonical({ source_commit: config.source_commit, dataset_sha256: inputs.dataset_sha256, slot_registration_sha256: inputs.binding.slot_registration_sha256, snapshot_sha256: snapshot.sha256, query_sha256: sha256(query), model: config.model, base_prompt_sha256: config.base_prompt_sha256, wrapper_prompt_sha256: config.wrapper_prompt_sha256, sampling: config.sampling, retry_policy: canonicalRetryPolicy(config.retry_policy), slot_bytes: slotBytes, measured_effective_e: measuredE }));
}

async function assembleCondition({ fixture, inputs, config, condition, trustedQuery = runTrustedQuery, trustedResult, transcript }) {
  if (!["P0", "P1", "PX"].includes(condition)) throw new Error("condition must be P0, P1, or PX");
  const immutableConfig = requireImmutableConfig(config, inputs);
  const snapshot = createSnapshot(fixture.accepted_snapshot);
  let result = trustedResult;
  // P0 must be constructible without touching the trusted-query runtime.
  // PX reuses an explicitly supplied P1 result, keeping it exploratory.
  if (condition === "P1") result = (await trustedQuery({ snapshot, goal: fixture.query })).proof.result;
  if ((condition === "P1" || condition === "PX") && !result) throw new Error(`${condition} requires an explicit trusted proof/missing result`);
  const pair = assembleCase(inputs.dataset, fixture, result || { status: "neutral-control" });
  const built = promptFor(pair, condition, transcript);
  leakGuard({ ...built, condition, fixture, trusted_result: result, pair });
  const assembly = deepFreeze({
    condition, case_id: fixture.id, fixture: copy(fixture), snapshot: copy(snapshot), query: fixture.query,
    trusted_result: condition === "P0" ? null : copy(result), pair: copy(pair), inputs: copy(inputs),
    ...built, proof_calls: condition === "P1" ? 1 : 0, config: copy(immutableConfig),
  });
  assemblyProvenance.set(assembly, Object.freeze({
    condition, case_id: fixture.id, fixture, snapshot, query: fixture.query, trusted_result: result,
    pair, inputs, config: immutableConfig, prompt: built.prompt, slotStart: built.slotStart,
    slotEnd: built.slotEnd, expectedSlot: built.prompt.slice(built.slotStart, built.slotEnd),
  }));
  return assembly;
}

function measuredUsage(usage) {
  if (!usage || !Number.isSafeInteger(usage.input_tokens) || !Number.isSafeInteger(usage.output_tokens) || !Number.isSafeInteger(usage.total_tokens) || usage.total_tokens !== usage.input_tokens + usage.output_tokens || !Number.isSafeInteger(usage.effective_context_budget)) throw new Error("provider/token-counter usage must contain integral input_tokens, output_tokens, total_tokens and measured effective_context_budget");
  return Object.freeze({ input_tokens: usage.input_tokens, output_tokens: usage.output_tokens, total_tokens: usage.total_tokens, effective_context_budget: usage.effective_context_budget });
}

async function executeWithInjectedProvider(assembled, provider) {
  if (!provider || typeof provider.complete !== "function") throw new Error("an injected provider is required; no default provider exists");
  // The sentinel runs immediately before the only caller-controlled transport.
  const provenance = assemblyProvenance.get(assembled);
  if (!provenance) throw new Error("unsealed or reconstructed assembly rejected before provider call");
  if (assembled.condition !== provenance.condition || assembled.case_id !== provenance.case_id ||
      assembled.prompt !== provenance.prompt || assembled.slotStart !== provenance.slotStart ||
      assembled.slotEnd !== provenance.slotEnd || assembled.prompt.slice(assembled.slotStart, assembled.slotEnd) !== provenance.expectedSlot) {
    throw new Error("sealed assembly provenance mismatch rejected before provider call");
  }
  if (provenance.condition === "P0" && provenance.expectedSlot !== provenance.pair.p0Slot) {
    throw new Error("P0 neutral control provenance mismatch rejected before provider call");
  }
  if ((provenance.condition === "P1" || provenance.condition === "PX") && provenance.expectedSlot !== provenance.pair.p1Slot) {
    throw new Error("P1/PX trusted serialization provenance mismatch rejected before provider call");
  }
  leakGuard({ prompt: provenance.prompt, condition: provenance.condition, slotStart: provenance.slotStart, slotEnd: provenance.slotEnd, fixture: provenance.fixture, trusted_result: provenance.trusted_result, pair: provenance.pair });
  const response = await provider.complete({ prompt: provenance.prompt, condition: provenance.condition, case_id: provenance.case_id });
  const usage = measuredUsage(response && response.usage);
  return Object.freeze({ raw: String(response.raw ?? ""), answer: String(response.answer ?? ""), usage, retry_policy: provenance.config.retry_policy, equality_digest: equalityDigest({ config: provenance.config, inputs: provenance.inputs, snapshot: provenance.snapshot, query: provenance.query, slotBytes: provenance.pair.declaredSlotBytes, measuredE: usage.effective_context_budget }) });
}

function resultEnvelope({ assembled, response, scorer_outcome }) {
  return Object.freeze({ schema_version: "trusted-proof-preflight-result-v1", condition: assembled.condition, case_id: assembled.case_id, prompt_sha256: sha256(assembled.prompt), snapshot_sha256: assembled.snapshot.sha256, query_sha256: sha256(assembled.query), trusted_proof_sha256: assembled.trusted_result ? sha256(canonical(assembled.trusted_result)) : null, usage: response.usage, retry_policy: response.retry_policy, equality_digest: response.equality_digest, scorer_outcome });
}

// Keep hidden contracts in the scorer only.  The result contains decisions,
// never the contract text, expected trusted result, or category labels.
function scoreHiddenContract({ answer, fixture, trustedResult }) {
  const contract = fixture.hidden_answer_contract;
  if (!contract || typeof contract.allowed !== "string") throw new Error("hidden answer contract is required only at scoring time");
  const evidence = JSON.stringify(trustedResult || "");
  const sources = [...evidence.matchAll(/turn\([^)]*\)/g)].map(match => match[0]);
  const text = String(answer).toLowerCase();
  return Object.freeze({ answer_correct: text.includes(contract.allowed.toLowerCase()), provenance_complete: sources.every(source => text.includes(source.toLowerCase())), required_provenance_count: sources.length });
}

function rejectUnequalBeforeScoring(records) {
  const p0 = records.find(record => record.condition === "P0"), p1 = records.find(record => record.condition === "P1");
  if (!p0 || !p1) throw new Error("P0 and P1 records are required");
  if (canonicalRetryPolicy(p0.retry_policy) !== canonicalRetryPolicy(p1.retry_policy)) throw new Error("retry policy mismatch rejected before scoring");
  if (p0.usage.effective_context_budget !== p1.usage.effective_context_budget) throw new Error("unequal measured E rejected before scoring");
  if (p0.equality_digest !== p1.equality_digest) throw new Error("P0/P1 equality digest mismatch rejected before scoring");
  return true;
}

function writeArtifact({ directory, name, envelope, raw }) {
  if (!path.isAbsolute(directory)) throw new Error("artifact directory must be absolute");
  if (!/^[A-Za-z0-9._-]+$/.test(name)) throw new Error("artifact name is unsafe");
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const rawFile = path.join(directory, `${name}.raw.txt`), envelopeFile = path.join(directory, `${name}.json`);
  fs.writeFileSync(rawFile, String(raw), { encoding: "utf8", flag: "wx", mode: 0o600 });
  const record = { ...envelope, raw_ref: path.basename(rawFile) };
  try { fs.writeFileSync(envelopeFile, `${canonical(record)}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 }); }
  catch (error) { fs.unlinkSync(rawFile); throw error; }
  return Object.freeze({ raw_file: rawFile, envelope_file: envelopeFile });
}

function validateLiveGate({ provider, allowLiveProvider, config, inputs }) {
  if (!provider || typeof provider.complete !== "function") throw new Error("live adapter requires an explicit provider");
  if (allowLiveProvider !== true) throw new Error("live adapter requires --allow-live-provider");
  requireImmutableConfig(config, inputs);
  return Object.freeze({ allowed_to_construct_adapter: true, invocation_implemented: false });
}

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--allow-live-provider") result.allowLiveProvider = true;
    else if (token === "--config" && argv[i + 1]) result.config = argv[++i];
    else throw new Error("usage: --config FILE [--allow-live-provider]");
  }
  return result;
}

module.exports = { FORBIDDEN, assembleCondition, equalityDigest, executeWithInjectedProvider, immutableInputs, leakGuard, measuredUsage, parseArgs, rejectUnequalBeforeScoring, requireImmutableConfig, resultEnvelope, scoreHiddenContract, validateLiveGate, writeArtifact };

if (require.main === module) {
  try {
    const args = parseArgs(process.argv.slice(2)), inputs = immutableInputs();
    if (!args.allowLiveProvider) console.log(JSON.stringify({ status: "offline-preflight-only", provider_calls: 0, dataset_sha256: inputs.dataset_sha256 }));
    else {
      if (!args.config) throw new Error("--allow-live-provider also requires --config with complete immutable bindings");
      requireImmutableConfig(readJson(args.config), inputs);
      throw new Error("live adapter invocation is intentionally not implemented in alpha");
    }
  } catch (error) { console.error(`preflight: ${error.message}`); process.exitCode = 1; }
}
