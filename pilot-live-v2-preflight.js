"use strict";

// Deterministic preparation gate for the prospective gpt-5.6-luna run.
// This module intentionally has no provider import or invocation. A passing
// preflight only means that a later, explicitly opted-in run may start.
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const {
  ANSWER_PROMPT_TEMPLATE,
  CODEX_PROMPT_TEMPLATE,
  checkPrompt,
  validateDataset,
  validatePilotConfig,
} = require("./pilot-runner");
const { ACTIVE_ONTOLOGY, canonicalJson } = require("./ontology-registry");
const { PROMPT_TEMPLATE, sha256 } = require("./live-extraction-harness");

const TARGET_MODEL = "gpt-5.6-luna";
const TARGET_PROVIDER = "codex";
const TARGET_E = 32768;
const MODEL_CONDITIONS = ["B1", "B2", "B3", "B4"];
const CODEX_ADAPTER_PROMPT_ID = "codex-extraction-v2-strict-v1";

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    fail("INPUT", `${file}: ${error.message}`);
  }
}

function fileHash(file) {
  try {
    return sha256(fs.readFileSync(file));
  } catch (error) {
    fail("INPUT_MISSING", `${file}: ${error.message}`);
  }
}

function readDataset(file) {
  const text = fs.readFileSync(file, "utf8");
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  let dataset;
  try {
    dataset = lines.map((line) => JSON.parse(line));
  } catch (error) {
    fail("DATASET", `${file}: invalid JSONL: ${error.message}`);
  }
  return { text, dataset };
}

function sourceCommitReady(sourceCommit) {
  if (!/^[0-9a-f]{40}$/.test(sourceCommit)) fail("SOURCE_IDENTITY", "source_commit must be a 40-hex commit SHA");
  try {
    execFileSync("git", ["cat-file", "-e", `${sourceCommit}^{commit}`], {
      cwd: process.cwd(), stdio: "ignore",
    });
  } catch (_) {
    fail("SOURCE_IDENTITY", `source_commit is not a resolvable local commit: ${sourceCommit}`);
  }
  return { source_commit: sourceCommit, resolvable_local_commit: true };
}

function validateLiveExecutionGate(config, { allowLiveProvider = false, rawOutputDir } = {}) {
  if (config.provider !== TARGET_PROVIDER) fail("LIVE_PROVIDER", `live-v2 provider must be ${TARGET_PROVIDER}`);
  if (allowLiveProvider !== true && allowLiveProvider !== "true") fail("LIVE_OPT_IN", "live provider requires explicit --allow-live-provider=true");
  if (typeof rawOutputDir !== "string" || !rawOutputDir.trim()) fail("RAW_OUTPUT_REQUIRED", "live provider requires a raw output directory");
  return { provider: config.provider, opt_in_required: true, opt_in_received: true, raw_output_required: true, raw_output_dir: path.resolve(rawOutputDir) };
}

function validateBudgetPlan(config) {
  if (config.effective_context_budget_tokens !== TARGET_E) fail("BUDGET_CONFIG", `live-v2 requires effective_context_budget_tokens=${TARGET_E}`);
  if (!Array.isArray(config.conditions) || JSON.stringify(config.conditions) !== JSON.stringify(MODEL_CONDITIONS)) fail("CONDITION_PLAN", "live-v2 conditions must be [B1,B2,B3,B4]");
  const planned = Object.fromEntries(MODEL_CONDITIONS.map((condition) => [condition, config.effective_context_budget_tokens]));
  if (new Set(Object.values(planned)).size !== 1) fail("BUDGET_MISMATCH", "planned B1-B4 effective context budgets are unequal");
  return { configured_e: config.effective_context_budget_tokens, conditions: planned, equal: true, measured: false, measurement_required_at_runtime: true };
}

function inspectLeakage(dataset) {
  let checked = 0;
  for (const item of dataset) {
    for (const turn of item.dialogue) {
      checked += 1;
      const prompt = PROMPT_TEMPLATE.replace("{{text}}", turn.text);
      try {
        checkPrompt(prompt);
      } catch (error) {
        // Preserve the runner's exact fail-closed code and identify the input.
        fail(error.code || "LEAKAGE", `${error.message} (${item.case_id}/turn-${turn.turn || checked})`);
      }
    }
  }
  // The fixed answer template is also checked even though its placeholders are
  // not populated during preflight; the run will inspect each assembled prompt.
  checked += 1;
  checkPrompt(ANSWER_PROMPT_TEMPLATE);
  return { checked_prompts: checked, status: "pass", runtime_recheck_required: true };
}

function runPreflight({ configFile, datasetFile, oracleFile, trustedMemoryPath = "memory.pl", trustedDomainPath = "domain-rules.pl" }) {
  const config = readJson(configFile);
  const { text: datasetText, dataset } = readDataset(datasetFile);
  const oracleText = fs.readFileSync(oracleFile, "utf8");
  const datasetHash = sha256(datasetText);
  const oracleHash = sha256(oracleText);
  validateDataset(dataset);
  validatePilotConfig(config, datasetHash, oracleHash, "B1");
  if (config.provider !== TARGET_PROVIDER || config.model !== TARGET_MODEL) fail("MODEL_PIN", `live-v2 must pin ${TARGET_PROVIDER}/${TARGET_MODEL}`);
  if (config.provider_adapter_prompt_id !== CODEX_ADAPTER_PROMPT_ID || config.provider_adapter_prompt_sha256 !== sha256(CODEX_PROMPT_TEMPLATE)) fail("PROMPT_PIN", "Codex adapter prompt pin does not match codex-extraction-v2-strict-v1");
  const source = sourceCommitReady(config.source_commit);
  const trusted = { memory_sha256: fileHash(trustedMemoryPath), domain_sha256: fileHash(trustedDomainPath) };
  if (trusted.memory_sha256 !== config.trusted_memory_sha256 || trusted.domain_sha256 !== config.trusted_domain_sha256) fail("TRUSTED_HASH_MISMATCH", "trusted source hash does not match live-v2 config");
  const budget = validateBudgetPlan(config);
  const leakage = inspectLeakage(dataset);
  return {
    schema_version: "prolog-memory-live-v2-preflight-v1",
    status: "ready_for_explicit_live_run",
    evidence_boundary: "preflight_only",
    provider_calls: 0,
    config_sha256: sha256(canonicalJson(config)),
    config_file: path.resolve(configFile),
    source_identity: source,
    model: { provider: config.provider, model: config.model },
    inputs: { dataset_sha256: datasetHash, oracle_sha256: oracleHash, trusted_memory_sha256: trusted.memory_sha256, trusted_domain_sha256: trusted.domain_sha256, case_count: dataset.length },
    prompt_pins: { extraction_prompt_id: config.extraction_prompt_id, extraction_prompt_sha256: config.extraction_prompt_sha256, provider_adapter_prompt_id: config.provider_adapter_prompt_id, provider_adapter_prompt_sha256: config.provider_adapter_prompt_sha256, answer_prompt_id: config.answer_prompt_id, answer_prompt_sha256: config.answer_prompt_sha256 },
    budget,
    leakage,
    live_execution: { explicit_opt_in_required: true, raw_output_dir_required: true, raw_outputs_present: false, provider_calls_allowed_during_preflight: false },
  };
}

function writePreflight(file, result) {
  const resolved = path.resolve(file);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, `${canonicalJson(result)}\n`, { encoding: "utf8", flag: "wx" });
  return resolved;
}

function parseArgs(argv) {
  const args = {};
  const options = new Set(["config", "dataset", "oracle", "output", "trusted-memory", "trusted-domain"]);
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--") || i + 1 >= argv.length || argv[i + 1].startsWith("--")) fail("CLI", "unknown or missing option value");
    const key = token.slice(2);
    if (!options.has(key)) fail("CLI", `unknown option: --${key}`);
    args[key] = argv[++i];
  }
  return args;
}

module.exports = { TARGET_MODEL, TARGET_PROVIDER, TARGET_E, CODEX_ADAPTER_PROMPT_ID, inspectLeakage, parseArgs, runPreflight, validateBudgetPlan, validateLiveExecutionGate, writePreflight };

if (require.main === module) {
  try {
    const args = parseArgs(process.argv.slice(2));
    for (const key of ["config", "dataset", "oracle", "output"]) if (!args[key]) fail("CLI", `--${key} is required`);
    const result = runPreflight({ configFile: args.config, datasetFile: args.dataset, oracleFile: args.oracle, trustedMemoryPath: args["trusted-memory"] || "memory.pl", trustedDomainPath: args["trusted-domain"] || "domain-rules.pl" });
    writePreflight(args.output, result);
    console.log(`✓ Preflight passed with 0 provider calls; wrote ${args.output}`);
  } catch (error) {
    console.error(`✗ ${error.code || "PREFLIGHT"}: ${error.message}`);
    process.exitCode = 1;
  }
}
