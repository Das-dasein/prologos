"use strict";

// Collector for the representation-formalization P0/P1 baseline.  This is
// intentionally a small, sealed Responses-only path: it never imports a
// solver, never reconstructs prompts, and has no tool declaration surface.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { SCHEMA_VERSION, validateCoverage, validatePublicPrompt } = require("./representation-world-generator");
const { canonicalSampling, createOpenAIAnsweringProvider } = require("./providers/openai-answering");

const EVALUATOR_SCHEMA_VERSION = "representation-live-evaluator-v1";
const RUN_SCHEMA_VERSION = "representation-live-run-v1";
const CONFIG_SCHEMA_VERSION = "representation-live-config-v1";
const CONDITION_ORDER = ["P0", "P1"];
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const stable = value => JSON.stringify(value, null, 2) + "\n";
const readJson = file => JSON.parse(fs.readFileSync(file, "utf8"));
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

function requireText(value, name) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${name} must be non-empty text`);
  return value;
}
function requireHash(value, name) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) throw new Error(`${name} must be a SHA-256 hex digest`);
  return value;
}
function exactKeys(value, keys, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${name} must be an object`);
  const actual = Object.keys(value).sort(), expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) throw new Error(`${name} must contain exactly ${expected.join(", ")}`);
}
function writeExclusive(file, content) {
  fs.writeFileSync(file, content, { encoding: "utf8", flag: "wx", mode: 0o600 });
  return Object.freeze({ file, sha256: sha256(content) });
}
function localRef(root, file) { return `local://${path.relative(root, file).split(path.sep).join("/")}`; }

function loadFixture(file) {
  if (typeof file !== "string" || !path.isAbsolute(file)) throw new Error("fixture must be an absolute file");
  const bytes = fs.readFileSync(file, "utf8"), fixture = JSON.parse(bytes);
  validateFixture(fixture);
  return Object.freeze({ file, bytes, sha256: sha256(bytes), fixture });
}
function validateFixture(fixture) {
  if (!fixture || fixture.schema_version !== SCHEMA_VERSION || !Array.isArray(fixture.cases)) throw new Error(`fixture.schema_version must be ${SCHEMA_VERSION}`);
  validateCoverage(fixture.cases);
  const ids = new Set();
  for (const item of fixture.cases) {
    if (!item || typeof item.case_id !== "string" || !item.case_id || ids.has(item.case_id)) throw new Error("fixture case ids must be unique non-empty text");
    ids.add(item.case_id);
    if (!item.prompts || typeof item.prompts.p0 !== "string" || typeof item.prompts.p1 !== "string") throw new Error(`${item.case_id}: fixture must contain P0/P1 prompt text`);
    if (!item.oracle || !["entailed", "unknown"].includes(item.oracle.label)) throw new Error(`${item.case_id}: fixture must contain an oracle label`);
    for (const condition of CONDITION_ORDER) {
      const prompt = item.prompts[condition.toLowerCase()];
      validatePublicPrompt(prompt);
      // The fixture boundary must be explicit even if the generator's list
      // changes: P0/P1 model input cannot name any solver surface.
      // RESULT is the required answer envelope, not an oracle result.  All
      // semantic-result and solver-bearing material remains forbidden.
      if (/\b(?:oracle|expected|proof|engine|tool|solver|prolog-engine)\b/i.test(prompt)) throw new Error(`${item.case_id} ${condition}: forbidden model-input material`);
    }
  }
  return true;
}
function validateConfig(config, fixtureHash) {
  exactKeys(config, ["fixture_sha256", "model", "provider", "retry_policy", "sampling", "schema_version"], "config");
  if (config.schema_version !== CONFIG_SCHEMA_VERSION) throw new Error(`config.schema_version must be ${CONFIG_SCHEMA_VERSION}`);
  if (config.provider !== "openai-api") throw new Error("P0/P1 v1 requires config.provider openai-api");
  requireText(config.model, "config.model");
  requireHash(config.fixture_sha256, "config.fixture_sha256");
  if (config.fixture_sha256 !== fixtureHash) throw new Error("config.fixture_sha256 does not bind the supplied fixture");
  canonicalSampling(config.sampling);
  exactKeys(config.retry_policy, ["max_attempts", "retryable"], "config.retry_policy");
  if (config.retry_policy.max_attempts !== 1 || !Array.isArray(config.retry_policy.retryable) || config.retry_policy.retryable.length !== 0) throw new Error("config.retry_policy must pin one attempt and no retryable errors");
  return Object.freeze({ ...config, sampling: canonicalSampling(config.sampling), retry_policy: Object.freeze({ max_attempts: 1, retryable: Object.freeze([]) }) });
}
function loadConfig(file, fixtureHash) {
  if (typeof file !== "string" || !path.isAbsolute(file)) throw new Error("config must be an absolute file");
  const bytes = fs.readFileSync(file, "utf8"), config = validateConfig(JSON.parse(bytes), fixtureHash);
  return Object.freeze({ file, bytes, sha256: sha256(bytes), config });
}
function counterbalancedPlan(fixture) {
  const cases = [...fixture.cases].sort((a, b) => a.case_id.localeCompare(b.case_id));
  const plan = [];
  for (let index = 0; index < cases.length; index += 1) {
    const order = index < cases.length / 2 ? CONDITION_ORDER : [...CONDITION_ORDER].reverse();
    for (const condition of order) plan.push(Object.freeze({ sequence: plan.length + 1, case: cases[index], condition, pair_order: order.join("→") }));
  }
  if (plan.length !== 48) throw new Error("fixture plan must contain exactly 48 calls");
  const orders = plan.filter(item => item.condition === "P0").map(item => item.pair_order);
  if (orders.filter(item => item === "P0→P1").length !== 12 || orders.filter(item => item === "P1→P0").length !== 12) throw new Error("plan must be 12 P0→P1 and 12 P1→P0 pairs");
  return Object.freeze(plan);
}
function parseAnswer(answer) {
  if (typeof answer !== "string") return Object.freeze({ format_valid: false, parsed_answer: null });
  const match = answer.match(/^RESULT: (entailed|unknown)\n?$/);
  return Object.freeze({ format_valid: Boolean(match), parsed_answer: match ? match[1] : null });
}
function scoreAnswer(answer, oracle) {
  const parsed = parseAnswer(answer);
  return Object.freeze({ ...parsed, content_correct: parsed.format_valid && parsed.parsed_answer === oracle, score: parsed.format_valid && parsed.parsed_answer === oracle ? "correct" : "incorrect" });
}
function requireFreshRawRoot(root) {
  if (typeof root !== "string" || !path.isAbsolute(root)) throw new Error("raw root must be a fresh absolute path");
  if (fs.existsSync(root)) throw new Error("raw root must not already exist");
  if (!fs.statSync(path.dirname(root)).isDirectory()) throw new Error("raw root parent must exist");
}
function assertLiveGates({ allowLiveProvider, model, rawRoot, provider }) {
  if (allowLiveProvider !== true) throw new Error("live collection requires --allow-live-provider");
  requireText(model, "--model");
  requireFreshRawRoot(rawRoot);
  if (provider !== "openai-api") throw new Error("P0/P1 v1 permits only provider openai-api Responses transport");
}
function providerResult(value) {
  if (!value || typeof value !== "object" || typeof value.answer !== "string" || typeof value.raw !== "string" || !value.usage || typeof value.usage !== "object") throw new Error("provider must return text answer, raw text, and native usage");
  const { input_tokens, output_tokens, total_tokens } = value.usage;
  if (![input_tokens, output_tokens, total_tokens].every(Number.isSafeInteger) || input_tokens < 0 || output_tokens < 0 || total_tokens !== input_tokens + output_tokens) throw new Error("provider usage must contain reconciling non-negative native token counts");
  return value;
}
function aggregate(records, fixtureBinding, configBinding) {
  const byCondition = {};
  for (const condition of CONDITION_ORDER) {
    const items = records.filter(item => item.condition === condition);
    byCondition[condition] = { denominator: items.length, correctness_count: items.filter(item => item.score && item.score.score === "correct").length, format_failure_count: items.filter(item => item.score && !item.score.format_valid).length, input_tokens: items.reduce((sum, item) => sum + (item.usage ? item.usage.input_tokens : 0), 0), output_tokens: items.reduce((sum, item) => sum + (item.usage ? item.usage.output_tokens : 0), 0) };
  }
  const pairs = new Map();
  for (const record of records) { const pair = pairs.get(record.case_id) || []; pair.push(record); pairs.set(record.case_id, pair); }
  const disagreements = [];
  for (const [case_id, pair] of pairs) if (pair.length !== 2 || pair[0].score.score !== pair[1].score.score || pair[0].score.parsed_answer !== pair[1].score.parsed_answer) disagreements.push(case_id);
  const invalid_or_missing_records = records.filter(item => !item.raw_response || !item.score.format_valid || item.transport_error).map(item => ({ record_id: item.record_id, reason: item.transport_error ? "transport_error" : !item.raw_response ? "missing_raw_response" : "format_failure" }));
  return { schema_version: RUN_SCHEMA_VERSION, evaluator_schema_version: EVALUATOR_SCHEMA_VERSION, cdr_status: "not-a-cdr-receipt", fixture: fixtureBinding, config: configBinding, calls_expected: 48, calls_recorded: records.length, per_condition: byCondition, paired_disagreements: disagreements, input_tokens_total: records.reduce((sum, item) => sum + (item.usage ? item.usage.input_tokens : 0), 0), output_tokens_total: records.reduce((sum, item) => sum + (item.usage ? item.usage.output_tokens : 0), 0), invalid_or_missing_records, records };
}
async function collectLive({ fixtureInput, configInput, allowLiveProvider, provider = "openai-api", model, rawRoot, providerFactory }) {
  const fixtureLoaded = typeof fixtureInput === "string" ? loadFixture(fixtureInput) : fixtureInput;
  if (!fixtureLoaded || !fixtureLoaded.fixture || typeof fixtureLoaded.bytes !== "string" || !fixtureLoaded.sha256 || sha256(fixtureLoaded.bytes) !== fixtureLoaded.sha256) throw new Error("a hash-validated fixture input is required");
  validateFixture(fixtureLoaded.fixture);
  const configLoaded = typeof configInput === "string" ? loadConfig(configInput, fixtureLoaded.sha256) : configInput;
  if (!configLoaded || !configLoaded.config || typeof configLoaded.bytes !== "string" || !configLoaded.sha256 || sha256(configLoaded.bytes) !== configLoaded.sha256) throw new Error("a hash-validated config input is required");
  const config = validateConfig(configLoaded.config, fixtureLoaded.sha256);
  assertLiveGates({ allowLiveProvider, model, rawRoot, provider });
  if (model !== config.model) throw new Error("--model must match config.model");
  if (provider !== config.provider) throw new Error("selected provider must match config.provider");
  if (typeof providerFactory !== "function") throw new Error("providerFactory must be a function");
  const plan = counterbalancedPlan(fixtureLoaded.fixture);
  fs.mkdirSync(rawRoot, { mode: 0o700 });
  const transport = providerFactory({ config, provider });
  if (!transport || typeof transport.complete !== "function") throw new Error("providerFactory must return a complete({prompt}) transport");
  const records = [];
  for (const item of plan) {
    const directory = path.join(rawRoot, "calls", `${String(item.sequence).padStart(2, "0")}-${item.case.case_id}-${item.condition.toLowerCase()}`);
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    const prompt = item.case.prompts[item.condition.toLowerCase()];
    const promptArtifact = writeExclusive(path.join(directory, "submitted-prompt.txt"), prompt);
    let responseArtifact = null, response = null, transportError = null;
    try {
      response = providerResult(await transport.complete({ prompt }));
      responseArtifact = writeExclusive(path.join(directory, "provider-response.raw.json"), response.raw);
    } catch (error) {
      transportError = String(error && (error.stack || error.message) || error);
      responseArtifact = writeExclusive(path.join(directory, "provider-error.raw.txt"), transportError + "\n");
    }
    const score = scoreAnswer(response && response.answer, item.case.oracle.label);
    const record = { record_id: `${item.case.case_id}-${item.condition.toLowerCase()}`, case_id: item.case.case_id, condition: item.condition, counterbalanced_order: item.pair_order, fixture_sha256: fixtureLoaded.sha256, config_sha256: configLoaded.sha256, prompt_sha256: sha256(prompt), prompt: { ref: localRef(rawRoot, promptArtifact.file), sha256: promptArtifact.sha256 }, raw_response: { ref: localRef(rawRoot, responseArtifact.file), sha256: responseArtifact.sha256 }, provider: "openai-api", model: config.model, sampling: config.sampling, retry_policy: config.retry_policy, usage: response ? response.usage : null, parsed_answer: score.parsed_answer, score, transport_error: transportError };
    writeExclusive(path.join(directory, "record.json"), stable(record));
    records.push(Object.freeze(record));
  }
  const result = aggregate(records, { file_sha256: fixtureLoaded.sha256, schema_version: fixtureLoaded.fixture.schema_version, case_count: fixtureLoaded.fixture.cases.length }, { file_sha256: configLoaded.sha256, schema_version: config.schema_version, provider: config.provider, model: config.model, sampling: config.sampling, retry_policy: config.retry_policy });
  const aggregateArtifact = writeExclusive(path.join(rawRoot, "aggregate-not-a-cdr-receipt.json"), stable(result));
  return Object.freeze({ aggregate: result, aggregate_file: aggregateArtifact.file, raw_root: rawRoot });
}
function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--allow-live-provider") result.allowLiveProvider = true;
    else if (["--fixture", "--config", "--provider", "--model", "--raw-root"].includes(token) && argv[index + 1]) result[{ "--fixture": "fixture", "--config": "config", "--provider": "provider", "--model": "model", "--raw-root": "rawRoot" }[token]] = argv[++index];
    else throw new Error("usage: --fixture ABSOLUTE_FILE --config ABSOLUTE_FILE [--allow-live-provider --provider openai-api --model MODEL --raw-root FRESH_ABSOLUTE_DIR]");
  }
  return result;
}
module.exports = { CONFIG_SCHEMA_VERSION, EVALUATOR_SCHEMA_VERSION, RUN_SCHEMA_VERSION, aggregate, collectLive, counterbalancedPlan, loadConfig, loadFixture, parseAnswer, parseArgs, requireFreshRawRoot, scoreAnswer, validateConfig, validateFixture };

if (require.main === module) {
  (async () => {
    const args = parseArgs(process.argv.slice(2));
    const fixture = loadFixture(args.fixture), config = loadConfig(args.config, fixture.sha256);
    if (!args.allowLiveProvider) return console.log(JSON.stringify({ status: "offline-validated-no-provider-call", provider_calls: 0, fixture_sha256: fixture.sha256, config_sha256: config.sha256, calls_planned: 48 }));
    const result = await collectLive({ fixtureInput: fixture, configInput: config, allowLiveProvider: true, provider: args.provider, model: args.model, rawRoot: args.rawRoot, providerFactory: ({ config: liveConfig }) => createOpenAIAnsweringProvider({ config: liveConfig }) });
    console.log(JSON.stringify({ status: "collected-not-a-cdr-receipt", records: result.aggregate.calls_recorded, aggregate: result.aggregate_file }));
  })().catch(error => { console.error(`representation-live-evaluator: ${error.stack || error.message}`); process.exitCode = 1; });
}
