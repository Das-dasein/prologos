"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { CONFIG_SCHEMA_VERSION, collectLive, counterbalancedPlan, loadFixture, parseAnswer, scoreAnswer, validateConfig } = require("./representation-live-evaluator");

const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const stable = value => JSON.stringify(value, null, 2) + "\n";

async function main() {
  const fixturePath = path.join(__dirname, ".cdr/waves/representation-formalization-v1/representation-world-fixture-v1.json");
  const fixture = loadFixture(fixturePath);
  const config = { schema_version: CONFIG_SCHEMA_VERSION, provider: "openai-api", model: "fake-responses-model", sampling: { temperature: 0, top_p: 1 }, retry_policy: { max_attempts: 1, retryable: [] }, fixture_sha256: fixture.sha256 };
  const configInput = { config: validateConfig(config, fixture.sha256), bytes: stable(config), sha256: sha256(stable(config)) };
  const plan = counterbalancedPlan(fixture.fixture);
  assert.equal(plan.length, 48);
  assert.deepEqual(plan.slice(0, 2).map(item => item.condition), ["P0", "P1"]);
  assert.deepEqual(plan.slice(24, 26).map(item => item.condition), ["P1", "P0"]);
  assert.equal(plan.filter(item => item.condition === "P0" && item.pair_order === "P0→P1").length, 12);
  assert.equal(plan.filter(item => item.condition === "P0" && item.pair_order === "P1→P0").length, 12);
  assert.deepEqual(parseAnswer("RESULT: entailed"), { format_valid: true, parsed_answer: "entailed" });
  assert.deepEqual(parseAnswer("RESULT: unknown\n"), { format_valid: true, parsed_answer: "unknown" });
  for (const answer of ["RESULT: entailed\n\n", "result: entailed", "RESULT: Entailed", "RESULT: unknown because missing", "entailed"]) assert.deepEqual(scoreAnswer(answer, "entailed"), { format_valid: false, parsed_answer: null, content_correct: false, score: "incorrect" }, `strict parser: ${JSON.stringify(answer)}`);

  let factories = 0;
  await assert.rejects(() => collectLive({ fixtureInput: fixture, configInput, allowLiveProvider: false, provider: "openai-api", model: config.model, rawRoot: path.join(os.tmpdir(), "not-created-representation-live"), providerFactory: () => { factories += 1; throw new Error("must not construct"); } }), /allow-live-provider/);
  assert.equal(factories, 0, "no live opt-in never constructs a provider");
  const invalidConfig = { ...config, fixture_sha256: "0".repeat(64) };
  await assert.rejects(() => collectLive({ fixtureInput: fixture, configInput: { config: invalidConfig, bytes: stable(invalidConfig), sha256: sha256(stable(invalidConfig)) }, allowLiveProvider: true, provider: "openai-api", model: config.model, rawRoot: path.join(os.tmpdir(), "not-created-representation-live-binding"), providerFactory: () => { factories += 1; throw new Error("must not construct"); } }), /does not bind/);
  assert.equal(factories, 0, "invalid fixture/config binding never constructs a provider");

  let integrityFactories = 0, integrityCalls = 0;
  const neverConstruct = () => {
    integrityFactories += 1;
    return { async complete() { integrityCalls += 1; throw new Error("must not call"); } };
  };
  const mutatedFixture = JSON.parse(JSON.stringify(fixture.fixture));
  mutatedFixture.cases[0].prompts.p0 = "mutated only in memory";
  await assert.rejects(() => collectLive({ fixtureInput: { ...fixture, fixture: mutatedFixture }, configInput, allowLiveProvider: true, provider: "openai-api", model: config.model, rawRoot: path.join(os.tmpdir(), "not-created-representation-live-fixture-integrity"), providerFactory: neverConstruct }), /fixture object does not exactly match its verified bytes/);
  assert.equal(integrityFactories, 0, "mutated fixture object never constructs a provider");
  assert.equal(integrityCalls, 0, "mutated fixture object never calls a provider");
  const mutatedConfig = JSON.parse(JSON.stringify(configInput.config));
  mutatedConfig.model = "mutated-only-in-memory";
  await assert.rejects(() => collectLive({ fixtureInput: fixture, configInput: { ...configInput, config: mutatedConfig }, allowLiveProvider: true, provider: "openai-api", model: config.model, rawRoot: path.join(os.tmpdir(), "not-created-representation-live-config-integrity"), providerFactory: neverConstruct }), /config object does not exactly match its verified bytes/);
  assert.equal(integrityFactories, 0, "mutated config object never constructs a provider");
  assert.equal(integrityCalls, 0, "mutated config object never calls a provider");

  const rootParent = fs.mkdtempSync(path.join(os.tmpdir(), "representation-live-evaluator-"));
  const rawRoot = path.join(rootParent, "raw");
  const expectedByPrompt = new Map();
  for (const item of fixture.fixture.cases) {
    expectedByPrompt.set(item.prompts.p0, item.oracle.label);
    expectedByPrompt.set(item.prompts.p1, item.oracle.label);
  }
  const calls = [];
  const result = await collectLive({ fixtureInput: fixture, configInput, allowLiveProvider: true, provider: "openai-api", model: config.model, rawRoot, providerFactory: received => {
    factories += 1;
    assert.deepEqual(received.config, configInput.config);
    return { async complete({ prompt }) {
      calls.push(prompt);
      // A fake transport sees only the sealed prompt.  It supplies one bad
      // answer to exercise retention rather than evaluator repair.
      const answer = calls.length === 7 ? "RESULT: entailed\n\n" : `RESULT: ${expectedByPrompt.get(prompt)}`;
      return { answer, raw: JSON.stringify({ fake: true, answer }), usage: { input_tokens: 10, output_tokens: 2, total_tokens: 12 } };
    } };
  } });
  assert.equal(factories, 1); assert.equal(calls.length, 48);
  assert.deepEqual(calls, plan.map(item => item.case.prompts[item.condition.toLowerCase()]), "provider gets the fixture's exact sealed P0/P1 prompt bytes only");
  for (const prompt of calls) assert.doesNotMatch(prompt, /\b(?:oracle|expected|proof|engine|tool|solver)\b/i, "provider prompt has no oracle or solver surface");
  assert.equal(result.aggregate.cdr_status, "not-a-cdr-receipt");
  assert.equal(result.aggregate.calls_recorded, 48);
  assert.equal(result.aggregate.per_condition.P0.denominator, 24);
  assert.equal(result.aggregate.per_condition.P1.denominator, 24);
  assert.equal(result.aggregate.per_condition.P0.input_tokens + result.aggregate.per_condition.P1.input_tokens, 480);
  assert.equal(result.aggregate.invalid_or_missing_records.length, 1);
  const malformed = result.aggregate.records[6];
  assert.equal(malformed.score.format_valid, false);
  const raw = path.join(rawRoot, malformed.raw_response.ref.replace("local://", ""));
  assert.equal(fs.readFileSync(raw, "utf8"), JSON.stringify({ fake: true, answer: "RESULT: entailed\n\n" }), "malformed provider answer stays raw evidence");
  assert.equal(fs.statSync(raw).mode & 0o777, 0o600, "raw output has restrictive permissions");
  assert.throws(() => fs.writeFileSync(raw, "overwrite", { flag: "wx" }), /EEXIST/, "raw output is append-only exclusive evidence");
  await assert.rejects(() => collectLive({ fixtureInput: fixture, configInput, allowLiveProvider: true, provider: "openai-api", model: config.model, rawRoot, providerFactory: () => { throw new Error("must not construct"); } }), /must not already exist/, "existing raw root fails closed");
  assert.equal(fs.existsSync(result.aggregate_file), true);
  console.log("representation-live-evaluator ok: offline gate, 48 counterbalanced sealed fake Responses calls, strict scoring, binding, and append-only raw evidence");
}

main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
