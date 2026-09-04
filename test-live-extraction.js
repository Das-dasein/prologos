"use strict";

const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { ACTIVE_ONTOLOGY, canonicalJson } = require("./ontology-registry");
const { createFakeProvider, runHarness, sha256, writeRunArtifact, PROMPT_TEMPLATE } = require("./live-extraction-harness");

const root = fs.mkdtempSync(path.join(os.tmpdir(), "pam-live-extraction-"));
const datasetFile = path.join(root, "dataset.jsonl");
const datasetText = `${JSON.stringify({ case_id: "fixture-01", dialogue: [{ speaker: "user", text: "I live in Samara." }] })}\n`;
fs.writeFileSync(datasetFile, datasetText);
const valid = {
  schema_version: "memory-extraction-v2",
  registry_identity: ACTIVE_ONTOLOGY.identity,
  assertions: [{ polarity: "positive", relation: "lives_in", arguments: ["user", "samara"], valid_from: null, valid_to: null, confidence: 0.99 }],
  ontology_candidates: [],
};
const config = {
  source_commit: "0123456789012345678901234567890123456789",
  dataset_sha256: sha256(datasetText),
  profile_identity: ACTIVE_ONTOLOGY.identity,
  provider: "fake",
  model: "fixture-model-v1",
  prompt_sha256: sha256(PROMPT_TEMPLATE),
  sampling: { temperature: 0 },
  retry_policy: { max_attempts: 1 },
  max_context_tokens: 4096,
};

const run = provider => runHarness({ config, datasetFile, provider });

(async () => {
  let calls = 0;
  const provider = createFakeProvider(valid);
  const checkedProvider = { extract: async args => { calls += 1; return provider.extract(args); } };
  const first = await run(checkedProvider);
  const second = await run(createFakeProvider(valid));
  assert.equal(calls, 1);
  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assert.equal(first.records[0].status, "ok");
  assert.equal(first.records[0].prompt_sha256, config.prompt_sha256);
  assert.equal(first.records[0].assembled_prompt_sha256, sha256(PROMPT_TEMPLATE.replace("{{text}}", "I live in Samara.")));

  const output = path.join(root, "run.json");
  writeRunArtifact(output, first);
  assert.equal(fs.readFileSync(output, "utf8"), `${canonicalJson(first)}\n`);
  assert.throws(() => writeRunArtifact(output, first), { code: "EEXIST" });

  for (const [name, bad, expected] of [
    ["malformed", { output: { ...valid, extra: true }, usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 } }, "INVALID_FORMAT"],
    ["stale identity", { output: { ...valid, registry_identity: { ...valid.registry_identity, version: "9.9.9" } }, usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 } }, "INVALID_FORMAT"],
    ["usage", { output: valid, usage: { input_tokens: 1 } }, "USAGE_MISSING"],
    ["budget", { output: valid, usage: { input_tokens: 4097, output_tokens: 1, total_tokens: 4098 } }, "BUDGET"],
  ]) {
    const result = await run({ extract: async () => bad });
    assert.equal(result.records[0].status, "failed", name);
    assert.equal(result.records[0].error.code, expected, name);
  }

  let leakageCalls = 0;
  const leaked = await runHarness({ config, datasetFile, promptBuilder: () => `I saw c_stable_01_a`, provider: { extract: async () => { leakageCalls += 1; return { output: valid, usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 } }; } } });
  assert.equal(leaked.records[0].error.code, "GOLD_LEAKAGE");
  assert.equal(leakageCalls, 0);
  await assert.rejects(() => runHarness({ config: { ...config, prompt_sha256: sha256("changed") }, datasetFile, provider: createFakeProvider(valid) }), { code: "PROMPT_PIN" });
  const rawDir = path.join(root, "raw");
  const rawRun = await runHarness({ config, datasetFile, rawOutputDir: rawDir, provider: createFakeProvider({ output: valid, raw_output: "provider raw" }) });
  assert.match(rawRun.records[0].raw_output_path, /fixture-01-turn-1\.json$/);
  assert.equal(fs.readFileSync(rawRun.records[0].raw_output_path, "utf8"), "provider raw\n");
  const cliOutput = path.join(root, "cli-run.json");
  const cli = spawnSync(process.execPath, [path.join(__dirname, "live-extraction-harness.js"), "--config", path.join(__dirname, "test-fixtures/live-extraction-config.json"), "--dataset", path.join(__dirname, "test-fixtures/live-extraction-cli.jsonl"), "--fixture", path.join(__dirname, "test-fixtures/live-extraction-valid.json"), "--output", cliOutput, "--provider", "fake"], { encoding: "utf8" });
  assert.equal(cli.status, 0, cli.stderr);
  assert.ok(fs.existsSync(cliOutput));
  const badCli = spawnSync(process.execPath, [path.join(__dirname, "live-extraction-harness.js")], { encoding: "utf8" });
  assert.equal(badCli.status, 2);
  assert.match(badCli.stderr, /Usage:/);
  assert.doesNotMatch(badCli.stderr, /TypeError|at /);
  const privateRun = await runHarness({ config, datasetFile, promptBuilder: () => "sk-private-marker", provider: { extract: async () => { leakageCalls += 1; return { output: valid, usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 } }; } } });
  assert.equal(privateRun.records[0].error.code, "PRIVATE_MARKER");
  assert.equal(leakageCalls, 0);
  console.log("live-extraction ok: 15 assertions");
})().catch(error => { console.error(error); process.exitCode = 1; });
