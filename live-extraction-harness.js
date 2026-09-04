"use strict";

// Provider-independent, non-writing pilot harness.  This module deliberately
// has no MemoryStore dependency: a run can only return local records.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { Extraction } = require("./llm-schema");
const { ACTIVE_ONTOLOGY, canonicalJson } = require("./ontology-registry");

const PRIVATE_MARKER = /(?:sk-[a-z0-9_-]{8,}|private[-_ ]marker|<private>|secret[-_ ]marker)/i;
const GOLD_ID = /c_stable_01_[ab]/;
const GOLD_PROPOSAL = /"relation"\s*:\s*"lives_in"[\s\S]{0,300}"arguments"\s*:\s*\[\s*"user"\s*,\s*"samara"/;
const PROMPT_TEMPLATE_NAME = "memory-extraction-v2-turn-v1";
const PROMPT_TEMPLATE = "Extract memory assertions from the user turn as memory-extraction-v2 JSON.\n\nUSER TURN:\n{{text}}";

function sha256(value) { return crypto.createHash("sha256").update(value).digest("hex"); }
function fail(code, message) { const error = new Error(message); error.code = code; throw error; }
function exactObject(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("CONFIG", `${label} must be an object`);
  const actual = Object.keys(value).sort(); const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, i) => key !== expected[i])) fail("CONFIG", `${label} has unknown or missing keys`);
}

function validateConfig(config, datasetSha256) {
  exactObject(config, ["source_commit", "dataset_sha256", "profile_identity", "provider", "model", "prompt_sha256", "sampling", "retry_policy", "max_context_tokens"], "run config");
  if (!/^[0-9a-f]{40}$/.test(config.source_commit)) fail("CONFIG", "source_commit must be a commit SHA");
  if (!/^[0-9a-f]{64}$/.test(config.dataset_sha256) || config.dataset_sha256 !== datasetSha256) fail("DATASET_HASH", "dataset SHA-256 does not match config");
  exactObject(config.profile_identity, ["name", "version", "sha256"], "profile_identity");
  if (JSON.stringify(config.profile_identity) !== JSON.stringify(ACTIVE_ONTOLOGY.identity)) fail("REGISTRY_IDENTITY", "config profile is not active");
  for (const key of ["provider", "model", "prompt_sha256"]) if (typeof config[key] !== "string" || !config[key]) fail("CONFIG", `${key} is required`);
  if (!["fake", "openai-api"].includes(config.provider)) fail("CONFIG", "provider must be fake or openai-api");
  if (!/^[a-f0-9]{64}$/.test(config.prompt_sha256)) fail("CONFIG", "prompt_sha256 must be sha256");
  if (config.prompt_sha256 !== sha256(PROMPT_TEMPLATE)) fail("PROMPT_PIN", `prompt_sha256 does not match ${PROMPT_TEMPLATE_NAME}`);
  if (!config.sampling || typeof config.sampling !== "object" || Array.isArray(config.sampling) || typeof config.sampling.temperature !== "number") fail("CONFIG", "sampling.temperature is required");
  if (!config.retry_policy || typeof config.retry_policy !== "object" || Array.isArray(config.retry_policy) || !Number.isInteger(config.retry_policy.max_attempts) || config.retry_policy.max_attempts < 1) fail("CONFIG", "retry_policy.max_attempts is required");
  if (!Number.isInteger(config.max_context_tokens) || config.max_context_tokens < 1) fail("CONFIG", "max_context_tokens is required");
  return config;
}

function preflightPrompt(prompt) {
  if (typeof prompt !== "string" || !prompt.trim()) fail("PROMPT", "prompt must be non-empty text");
  if (PRIVATE_MARKER.test(prompt)) fail("PRIVATE_MARKER", "private-data marker in provider prompt");
  if (GOLD_ID.test(prompt) || GOLD_PROPOSAL.test(prompt)) fail("GOLD_LEAKAGE", "stable-01 gold material in provider prompt");
  return true;
}

function readTurns(datasetFile) {
  const text = fs.readFileSync(datasetFile, "utf8");
  const cases = text.split(/\r?\n/).filter(Boolean).map((line, i) => {
    let item; try { item = JSON.parse(line); } catch (error) { fail("DATASET", `invalid JSONL at line ${i + 1}`); }
    if (!item || typeof item.case_id !== "string" || !Array.isArray(item.dialogue)) fail("DATASET", `invalid case at line ${i + 1}`);
    return { case_id: item.case_id, dialogue: item.dialogue.map((turn, turnIndex) => {
      if (!turn || turn.speaker !== "user" || typeof turn.text !== "string") fail("DATASET", `invalid turn ${item.case_id}/${turnIndex + 1}`);
      if (PRIVATE_MARKER.test(turn.text)) fail("PRIVATE_MARKER", `private-data marker in dataset ${item.case_id}`);
      return { turn: turnIndex + 1, text: turn.text };
    }) };
  });
  return { text, cases };
}

function normalizeFailure(meta, error) {
  const code = error.code || (error.name === "ZodError" ? "INVALID_FORMAT" : "PROVIDER");
  return { ...meta, status: "failed", error: { code, message: error.message } };
}

function normalizeResult(result) {
  return JSON.parse(canonicalJson(result));
}

async function runHarness({ config, datasetFile, provider, promptBuilder = ({ text }) => PROMPT_TEMPLATE.replace("{{text}}", text), rawOutputDir }) {
  if (!provider || typeof provider.extract !== "function") fail("CONFIG", "an explicit provider adapter is required");
  const dataset = readTurns(datasetFile); const datasetHash = sha256(dataset.text); validateConfig(config, datasetHash);
  const records = [];
  for (const item of dataset.cases) for (const turn of item.dialogue) {
    const prompt = promptBuilder({ case_id: item.case_id, turn: turn.turn, text: turn.text });
    const meta = { source_commit: config.source_commit, dataset_sha256: datasetHash, profile_identity: config.profile_identity, provider: config.provider, model: config.model, prompt_template: PROMPT_TEMPLATE_NAME, prompt_sha256: config.prompt_sha256, assembled_prompt_sha256: sha256(prompt), sampling: config.sampling, retry_policy: config.retry_policy, case_id: item.case_id, turn: turn.turn };
    try {
      preflightPrompt(prompt);
      const response = await provider.extract({ prompt, case_id: item.case_id, turn: turn.turn });
      if (!response || typeof response !== "object" || typeof response.output !== "object" || !response.usage) fail("MALFORMED_OUTPUT", "provider must return output and usage");
      const usage = response.usage;
      if (!["input_tokens", "output_tokens", "total_tokens"].every(k => Number.isInteger(usage[k]) && usage[k] >= 0)) fail("USAGE_MISSING", "complete provider usage evidence is required");
      if (usage.total_tokens !== usage.input_tokens + usage.output_tokens) fail("USAGE_MISMATCH", "provider usage totals do not reconcile");
      if (usage.total_tokens > config.max_context_tokens || usage.input_tokens > config.max_context_tokens) fail("BUDGET", "provider usage exceeds configured context budget");
      const extraction = Extraction.parse(response.output);
      const raw_output_path = writeRawOutput(rawOutputDir, item.case_id, turn.turn, response.raw_output);
      records.push({ ...meta, status: "ok", usage: { input_tokens: usage.input_tokens, output_tokens: usage.output_tokens, total_tokens: usage.total_tokens }, ...(raw_output_path ? { raw_output_path } : {}), extraction });
    } catch (error) { records.push(normalizeFailure(meta, error)); }
  }
  return normalizeResult({ schema_version: "live-extraction-run-v1", config_sha256: sha256(canonicalJson(config)), records });
}

function writeRunArtifact(file, result) {
  if (typeof file !== "string" || !file) fail("OUTPUT", "output path must be a local path");
  const resolved = path.resolve(file);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, `${canonicalJson(normalizeResult(result))}\n`, { encoding: "utf8", flag: "wx" });
  return resolved;
}

function createFakeProvider(fixtures) {
  return { async extract({ case_id, turn }) {
    const value = typeof fixtures === "function"
      ? fixtures({ case_id, turn })
      : (fixtures && (fixtures.schema_version || fixtures.output) ? fixtures : fixtures[`${case_id}/${turn}`] || fixtures.default);
    if (value instanceof Error) throw value;
    return { output: value && value.output ? value.output : value, raw_output: value && value.raw_output, usage: { input_tokens: 12, output_tokens: 8, total_tokens: 20 } };
  } };
}

function parseArgs(argv) {
  const args = {};
  const options = new Set(["config", "dataset", "fixture", "output", "provider", "raw-output-dir"]);
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--") || token === "--allow-live-provider") {
      if (token === "--allow-live-provider") args.allowLiveProvider = true;
      else fail("CLI", "unknown argument");
      continue;
    }
    const key = token.slice(2);
    if (!options.has(key) || i + 1 >= argv.length || argv[i + 1].startsWith("--")) fail("CLI", "unknown or missing option value");
    args[key] = argv[++i];
  }
  return args;
}

function writeRawOutput(dir, caseId, turn, rawOutput) {
  if (rawOutput === undefined || rawOutput === null) return undefined;
  if (!dir) fail("OUTPUT", "raw output requires --raw-output-dir");
  const safe = String(caseId).replace(/[^a-zA-Z0-9._-]/g, "_");
  const file = path.resolve(dir, `${safe}-turn-${turn}.json`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${typeof rawOutput === "string" ? rawOutput : canonicalJson(rawOutput)}\n`, { encoding: "utf8", flag: "wx" });
  return file;
}

function createOpenAIProvider() {
  const adapter = require("./providers/openai-api");
  return { extract: async ({ prompt }) => ({ output: await adapter.extractMemory(prompt), usage: {} }) };
}

module.exports = { createFakeProvider, normalizeResult, parseArgs, preflightPrompt, readTurns, runHarness, sha256, validateConfig, writeRawOutput, writeRunArtifact, PROMPT_TEMPLATE, PROMPT_TEMPLATE_NAME };

if (require.main === module) {
 (async () => {
  let args;
  try { args = parseArgs(process.argv.slice(2)); } catch (error) {
    console.error(`✗ Usage: node live-extraction-harness.js --config FILE --dataset FILE --output FILE --provider fake|openai-api [--allow-live-provider] [--raw-output-dir DIR]`);
    process.exitCode = 2;
  }
  if (!args || !args.config || !args.dataset || !args.output || !["fake", "openai-api"].includes(args.provider)) {
    if (args) console.error("✗ Usage: node live-extraction-harness.js --config FILE --dataset FILE --output FILE --provider fake|openai-api [--allow-live-provider] [--raw-output-dir DIR]");
    process.exitCode = 2;
  } else {
    if (args.provider === "openai-api" && !args.allowLiveProvider) {
      console.error("✗ Live provider is disabled; pass --provider openai-api --allow-live-provider"); process.exitCode = 2; return;
    }
    try {
      const config = JSON.parse(fs.readFileSync(path.resolve(args.config), "utf8"));
      const provider = args.provider === "fake"
        ? createFakeProvider(JSON.parse(fs.readFileSync(path.resolve(args.fixture || "test-fixtures/live-extraction-valid.json"), "utf8")))
        : createOpenAIProvider();
      runHarness({ config, datasetFile: args.dataset, provider, rawOutputDir: args["raw-output-dir"] })
        .then(result => { writeRunArtifact(args.output, result); console.log(`✓ Wrote ${args.output}`); })
        .catch(error => { console.error(`✗ ${error.code || "RUN"}: ${error.message}`); process.exitCode = 1; });
    } catch (error) { console.error(`✗ ${error.code || "CONFIG"}: ${error.message}`); process.exitCode = 1; }
  }
 })();
}
