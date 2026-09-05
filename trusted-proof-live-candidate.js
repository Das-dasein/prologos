"use strict";

// Operator collection only.  This file never chooses a provider or reads a
// credential: the command line is deliberately inert until every live gate is
// present.  Its output is an integrity candidate, never an aggregate/result.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { assembleCondition, immutableInputs, scoreHiddenContract } = require("./trusted-proof-preflight");
const { prepareOpenAIAnsweringRun } = require("./trusted-proof-answering");
const { canonicalSampling } = require("./providers/openai-answering");
const { validateEnvelope, trustedInputs } = require("./.cdr/waves/cognitive-proof-eval-v1/validate-receipt-intake-v3");

const WAVE = path.join(__dirname, ".cdr/waves/cognitive-proof-eval-v1");
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const readJson = file => JSON.parse(fs.readFileSync(file, "utf8"));
const requireText = (v, n) => { if (typeof v !== "string" || !v.trim()) throw new Error(`${n} is required`); return v; };

function freshRoot(root) {
  if (typeof root !== "string" || !path.isAbsolute(root)) throw new Error("operator root must be a fresh absolute path");
  if (fs.existsSync(root)) throw new Error("operator root must not already exist");
  if (!fs.statSync(path.dirname(root)).isDirectory()) throw new Error("operator root parent must exist");
}
function loadConfig(configPath) {
  if (typeof configPath !== "string" || !path.isAbsolute(configPath)) throw new Error("immutable config must be an absolute file");
  return Object.freeze(readJson(configPath));
}
async function validateConfig(config, inputs) {
  for (const key of ["source_commit", "model", "base_prompt_sha256", "wrapper_prompt_sha256", "dataset_sha256", "slot_registration_file_sha256", "slot_registration_sha256", "retry_policy"]) requireText(config[key], `config.${key}`);
  if (config.provider !== "openai-api") throw new Error("config.provider must be openai-api");
  canonicalSampling(config.sampling);
  const registry = await trustedInputs();
  if (config.source_commit !== registry.source_commit || config.dataset_sha256 !== inputs.dataset_sha256 || config.slot_registration_file_sha256 !== inputs.registration_sha256 || config.slot_registration_sha256 !== inputs.binding.slot_registration_sha256 || config.base_prompt_sha256 !== registry.wire_transport.template_identities.base_prompt_sha256 || config.wrapper_prompt_sha256 !== registry.wire_transport.template_identities.wrapper_prompt_sha256) throw new Error("config does not match CDR v3 registry and wire identities");
  return registry;
}
function runView(config) {
  return Object.freeze({ model: config.model, adapter: "openai-api", base_prompt_sha256: config.base_prompt_sha256, wrapper_prompt_sha256: config.wrapper_prompt_sha256, input_mode: "sealed-assembled-prompt-byte-for-byte", sampling: config.sampling, retry_policy: { max_attempts: 1, retryable: [] } });
}
function localRef(root, file) { return `local://${path.relative(root, file).split(path.sep).join("/")}`; }
function recordFor({ root, assembled, response, artifacts, run, fixture }) {
  const score = scoreHiddenContract({ answer: response.answer, fixture, trustedResult: assembled.trusted_result });
  return Object.freeze({
    record_id: `${assembled.case_id}-${assembled.condition.toLowerCase()}`, case_id: assembled.case_id, condition: assembled.condition,
    run_binding_sha256: sha256(JSON.stringify(run)), snapshot_sha256: sha256(JSON.stringify(fixture.accepted_snapshot)), query_sha256: sha256(JSON.stringify(fixture.query)), slot_bytes: assembled.pair.declaredSlotBytes,
    trusted_proof_sha256: assembled.trusted_result ? sha256(require("./.cdr/waves/cognitive-proof-eval-v1/validate-equal-budget-slots-v1").stable(assembled.trusted_result)) : null,
    prompt_sha256: sha256(assembled.prompt), prompt: { ref: localRef(root, artifacts.prompt_file), sha256: sha256(fs.readFileSync(artifacts.prompt_file)) }, raw: { ref: localRef(root, artifacts.raw_file), sha256: sha256(fs.readFileSync(artifacts.raw_file)) },
    usage: { measured_effective_context_budget: response.usage.effective_context_budget, provider_usage: { input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens } },
    scorer: { decision: score.answer_correct && score.provenance_complete ? "accepted" : "rejected", contract_sha256: sha256("cognitive-proof-hidden-contract-v1") }, supersedes_record_id: null
  });
}
async function collectCandidate({ config, root, allowLiveProvider, provider = "openai-api", model, clientFactory }) {
  if (allowLiveProvider !== true) throw new Error("collection requires --allow-live-provider");
  if (provider !== "openai-api") throw new Error("collection requires provider openai-api");
  if (model !== config.model) throw new Error("--model must match immutable config model");
  freshRoot(root); const inputs = immutableInputs(); const registry = await validateConfig(config, inputs);
  // The root is made only after all validation, and each preparation receives
  // a unique private child.  No partial run can manufacture the root receipt.
  fs.mkdirSync(root, { mode: 0o700 });
  const run = runView(config), records = [];
  try {
    for (const fixture of [...inputs.dataset.cases].sort((a, b) => a.id.localeCompare(b.id))) {
      const pair = [];
      for (const condition of ["P0", "P1"]) {
        const assembled = await assembleCondition({ fixture, inputs, config, condition });
        const dir = path.join(root, "attempts", fixture.id, condition.toLowerCase());
        fs.mkdirSync(path.dirname(dir), { recursive: true, mode: 0o700 });
        const transport = prepareOpenAIAnsweringRun({ provider, allowLiveProvider: true, config, inputs, rawDirectory: dir, clientFactory });
        const outcome = await transport.run(assembled);
        const record = recordFor({ root, assembled, response: outcome.response, artifacts: outcome.artifacts, run, fixture });
        records.push(record); pair.push(record);
      }
      if (pair[0].usage.measured_effective_context_budget !== pair[1].usage.measured_effective_context_budget || ["run_binding_sha256", "snapshot_sha256", "query_sha256", "slot_bytes"].some(k => pair[0][k] !== pair[1][k])) throw new Error(`${fixture.id}: P0/P1 immutable binding or E mismatch`);
    }
    if (!records.every(record => record && record.scorer && record.scorer.decision === "accepted")) {
      throw new Error("candidate receipt unavailable: every local scorer decision must be accepted");
    }
    const receipt = { schema_version: "cognitive-proof-eval-receipt-intake-v3", kind: "candidate_live_receipt", source_commit: registry.source_commit, dataset: registry.dataset, slot_registration: registry.slot_registration, trusted_proof_digest_registry: registry.trusted_proof_digest_registry, wire_prompt_digest_registry: { path: "wire-assembled-prompt-digest-registry-v3.json", sha256: registry.registry_sha256 }, run, records };
    const receiptFile = path.join(root, "candidate-receipt-v3.json"); fs.writeFileSync(receiptFile, `${JSON.stringify(receipt, null, 2)}\n`, { flag: "wx", mode: 0o600 });
    const integrity = await validateEnvelope(receipt, { rawRoot: root });
    return Object.freeze({ receipt_file: receiptFile, records: records.length, integrity });
  } catch (error) { throw error; }
}
function parseArgs(argv) { const a = {}; for (let i = 0; i < argv.length; i += 1) { const x = argv[i]; if (x === "--allow-live-provider") a.allowLiveProvider = true; else if (["--provider", "--config", "--model", "--root"].includes(x) && argv[i + 1]) a[{ "--provider": "provider", "--config": "configPath", "--model": "model", "--root": "root" }[x]] = argv[++i]; else throw new Error("usage: --provider openai-api --allow-live-provider --config ABSOLUTE_FILE --model MODEL --root FRESH_ABSOLUTE_DIR"); } return a; }
module.exports = { collectCandidate, freshRoot, loadConfig, parseArgs, validateConfig };
if (require.main === module) { (async () => { const args = parseArgs(process.argv.slice(2)); if (!args.allowLiveProvider) return console.log(JSON.stringify({ status: "offline-no-default-provider", provider_calls: 0 })); if (!args.configPath || !args.root || !args.model || !args.provider) throw new Error("all live gates are required"); const result = await collectCandidate({ ...args, config: loadConfig(args.configPath) }); console.log(JSON.stringify({ status: "candidate-integrity-collected-not-a-result", records: result.records, integrity: result.integrity.status, receipt: result.receipt_file })); })().catch(e => { console.error(`live-candidate: ${e.message}`); process.exitCode = 1; }); }
