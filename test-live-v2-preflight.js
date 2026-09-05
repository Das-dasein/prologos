"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const {
  CODEX_ADAPTER_PROMPT_ID,
  TARGET_E,
  TARGET_MODEL,
  inspectLeakage,
  runPreflight,
  validateBudgetPlan,
  validateLiveExecutionGate,
} = require("./pilot-live-v2-preflight");
const { canonicalJson } = require("./ontology-registry");
const { sha256 } = require("./live-extraction-harness");

const root = process.cwd();
const configFile = ".cdr/results/prolog-memory-eval-v0/pilot-live-v2-config.json";
const datasetFile = ".cdr/datasets/dialogues-pilot-v1.jsonl";
const oracleFile = ".cdr/results/prolog-memory-eval-v0/answer-oracle-v1.json";
const config = JSON.parse(fs.readFileSync(configFile, "utf8"));
const fakeConfigBefore = fs.readFileSync(".cdr/results/prolog-memory-eval-v0/pilot-config-v2.json", "utf8");

const first = runPreflight({ configFile, datasetFile, oracleFile });
const second = runPreflight({ configFile, datasetFile, oracleFile });
assert.deepEqual(first, second);
assert.equal(first.status, "ready_for_explicit_live_run");
assert.equal(first.evidence_boundary, "preflight_only");
assert.equal(first.provider_calls, 0);
assert.deepEqual(first.model, { provider: "codex", model: TARGET_MODEL });
assert.equal(first.budget.configured_e, TARGET_E);
assert.equal(first.budget.equal, true);
assert.equal(first.budget.measured, false);
assert.deepEqual(first.budget.conditions, { B1: TARGET_E, B2: TARGET_E, B3: TARGET_E, B4: TARGET_E });
assert.equal(first.leakage.status, "pass");
assert.equal(first.source_identity.resolvable_local_commit, true);
assert.equal(config.provider_adapter_prompt_id, CODEX_ADAPTER_PROMPT_ID);
assert.equal(first.config_sha256, sha256(canonicalJson(config)));
assert.equal(fs.readFileSync(".cdr/results/prolog-memory-eval-v0/pilot-config-v2.json", "utf8"), fakeConfigBefore);

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "pam-live-v2-preflight-"));
const output1 = path.join(temp, "preflight-1.json");
const output2 = path.join(temp, "preflight-2.json");
const cliArgs = ["pilot-live-v2-preflight.js", "--config", configFile, "--dataset", datasetFile, "--oracle", oracleFile, "--output"];
execFileSync(process.execPath, [...cliArgs, output1], { cwd: root, stdio: "pipe" });
execFileSync(process.execPath, [...cliArgs, output2], { cwd: root, stdio: "pipe" });
assert.deepEqual(JSON.parse(fs.readFileSync(output1, "utf8")), JSON.parse(fs.readFileSync(output2, "utf8")));

assert.throws(() => validateLiveExecutionGate(config), { code: "LIVE_OPT_IN" });
assert.throws(() => validateLiveExecutionGate(config, { allowLiveProvider: true }), { code: "RAW_OUTPUT_REQUIRED" });
assert.doesNotThrow(() => validateLiveExecutionGate(config, { allowLiveProvider: "true", rawOutputDir: path.join(temp, "raw") }));
assert.throws(() => validateLiveExecutionGate({ ...config, provider: "fake" }, { allowLiveProvider: true, rawOutputDir: temp }), { code: "LIVE_PROVIDER" });

assert.throws(() => validateBudgetPlan({ ...config, effective_context_budget_tokens: TARGET_E + 1 }), { code: "BUDGET_CONFIG" });
assert.throws(() => runPreflight({ configFile, datasetFile, oracleFile, trustedMemoryPath: path.join(temp, "missing-memory.pl") }), { code: "INPUT_MISSING" });

const leakedDataset = path.join(temp, "leaked.jsonl");
const leaked = fs.readFileSync(datasetFile, "utf8").trim().split(/\r?\n/).map(JSON.parse);
leaked[0].dialogue[0].text = "private c_stable_01_a";
fs.writeFileSync(leakedDataset, `${leaked.map(JSON.stringify).join("\n")}\n`);
assert.throws(() => inspectLeakage(leaked), { code: "GOLD_LEAKAGE" });
assert.throws(() => runPreflight({ configFile, datasetFile: leakedDataset, oracleFile }), { code: "DATASET_HASH" });

const badConfig = path.join(temp, "bad-config.json");
fs.writeFileSync(badConfig, `${JSON.stringify({ ...config, source_commit: "0".repeat(40) })}\n`);
assert.throws(() => runPreflight({ configFile: badConfig, datasetFile, oracleFile }), { code: "SOURCE_IDENTITY" });
const badPromptConfig = path.join(temp, "bad-prompt-config.json");
fs.writeFileSync(badPromptConfig, `${JSON.stringify({ ...config, extraction_prompt_sha256: "0".repeat(64) })}\n`);
assert.throws(() => runPreflight({ configFile: badPromptConfig, datasetFile, oracleFile }), { code: "PROMPT_PIN" });

console.log("live-v2 preflight ok: pinned Luna config, equal E, live/raw gates, leakage and source identity; 0 provider calls");
