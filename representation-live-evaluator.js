"use strict";

// Collector for the representation-formalization P0/P1 baseline.  This is
// intentionally a small, sealed Responses-only path: it never imports a
// solver, never reconstructs prompts, and has no tool declaration surface.
const crypto = require("node:crypto");
const { isDeepStrictEqual } = require("node:util");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const childProcess = require("node:child_process");
const { SCHEMA_VERSION, formalProgram, runPrologOracle, validateCoverage, validatePublicPrompt } = require("./representation-world-generator");
const { canonicalSampling, createOpenAIAnsweringProvider } = require("./providers/openai-answering");
const seatbelt = require("./trusted-proof-codex-seatbelt-v10");

const EVALUATOR_SCHEMA_VERSION = "representation-live-evaluator-v1";
const RUN_SCHEMA_VERSION = "representation-live-run-v1";
const CONFIG_SCHEMA_VERSION = "representation-live-config-v1";
const CONDITION_ORDER = ["P0", "P1"];
const THREE_CONDITION_ORDER = ["P0", "P1", "P2"];
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const stable = value => JSON.stringify(value, null, 2) + "\n";
const readJson = file => JSON.parse(fs.readFileSync(file, "utf8"));
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const FINAL_ANSWER_SCHEMA = Object.freeze({ type: "object", additionalProperties: false, required: ["answer"], properties: { answer: { type: "string" } } });

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
  if (!["openai-api", "codex-seatbelt", "codex-seatbelt-p2", "codex-trace-gated-p2"].includes(config.provider)) throw new Error("config.provider must be openai-api, codex-seatbelt, codex-seatbelt-p2, or codex-trace-gated-p2");
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
function canonicalVerifiedInput(input, kind) {
  if (!input || typeof input !== "object" || typeof input.bytes !== "string" || typeof input.sha256 !== "string" || sha256(input.bytes) !== input.sha256) {
    throw new Error(`a hash-validated ${kind} input is required`);
  }
  let parsed;
  try { parsed = JSON.parse(input.bytes); }
  catch { throw new Error(`${kind} bytes must contain JSON`); }
  // A parsed object is optional convenience metadata.  It can never replace
  // the content whose hash was verified above: reject any disagreement before
  // validation planning, gates, or provider construction.
  if (own(input, kind) && !isDeepStrictEqual(input[kind], parsed)) {
    throw new Error(`${kind} object does not exactly match its verified bytes`);
  }
  return Object.freeze({ ...input, [kind]: parsed });
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
  if (!["openai-api", "codex-seatbelt", "codex-seatbelt-p2", "codex-trace-gated-p2"].includes(provider)) throw new Error("unsupported representation transport");
}
function providerResult(value) {
  if (!value || typeof value !== "object" || typeof value.answer !== "string" || typeof value.raw !== "string" || !value.usage || typeof value.usage !== "object") throw new Error("provider must return text answer, raw text, and native usage");
  const { input_tokens, output_tokens, total_tokens } = value.usage;
  if (![input_tokens, output_tokens, total_tokens].every(Number.isSafeInteger) || input_tokens < 0 || output_tokens < 0 || total_tokens !== input_tokens + output_tokens) throw new Error("provider usage must contain reconciling non-negative native token counts");
  return value;
}
function aggregate(records, fixtureBinding, configBinding) {
  const byCondition = {};
  const conditions = records.some(item => item.condition === "P2") ? THREE_CONDITION_ORDER : CONDITION_ORDER;
  for (const condition of conditions) {
    const items = records.filter(item => item.condition === condition);
    byCondition[condition] = { denominator: items.length, correctness_count: items.filter(item => item.score && item.score.score === "correct").length, format_failure_count: items.filter(item => item.score && !item.score.format_valid).length, input_tokens: items.reduce((sum, item) => sum + (item.usage ? item.usage.input_tokens : 0), 0), output_tokens: items.reduce((sum, item) => sum + (item.usage ? item.usage.output_tokens : 0), 0) };
  }
  const pairs = new Map();
  for (const record of records) { const pair = pairs.get(record.case_id) || []; pair.push(record); pairs.set(record.case_id, pair); }
  const disagreements = [];
  const expectedPerCase = conditions.length;
  for (const [case_id, pair] of pairs) if (pair.length !== expectedPerCase || new Set(pair.map(item => `${item.score.score}:${item.score.parsed_answer}`)).size > 1) disagreements.push(case_id);
  const invalid_or_missing_records = records.filter(item => !item.raw_response || !item.score.format_valid || item.transport_error).map(item => ({ record_id: item.record_id, reason: item.transport_error ? "transport_error" : !item.raw_response ? "missing_raw_response" : "format_failure" }));
  return { schema_version: RUN_SCHEMA_VERSION, evaluator_schema_version: EVALUATOR_SCHEMA_VERSION, cdr_status: "not-a-cdr-receipt", fixture: fixtureBinding, config: configBinding, calls_expected: conditions.length * 24, calls_recorded: records.length, per_condition: byCondition, paired_disagreements: disagreements, input_tokens_total: records.reduce((sum, item) => sum + (item.usage ? item.usage.input_tokens : 0), 0), output_tokens_total: records.reduce((sum, item) => sum + (item.usage ? item.usage.output_tokens : 0), 0), invalid_or_missing_records, records };
}
function absoluteExecutable(value, label) {
  if (typeof value !== "string" || !path.isAbsolute(value) || !fs.existsSync(value) || !fs.statSync(value).isFile()) throw new Error(`${label} must be an existing absolute file`);
  const resolved = fs.realpathSync(value);
  fs.accessSync(resolved, fs.constants.X_OK);
  return resolved;
}
function exactAuthFile(value) {
  if (typeof value !== "string" || !path.isAbsolute(value) || !fs.existsSync(value) || !fs.statSync(value).isFile()) throw new Error("auth_file must be an existing absolute file");
  const resolved = fs.realpathSync(value);
  if (path.basename(resolved) !== "auth.json") throw new Error("auth_file must be the exact existing auth.json file");
  return resolved;
}
function resolveSwiplBinary(value = process.env.SWIPL_BIN) {
  if (value !== undefined && value !== "") return absoluteExecutable(value, "SWIPL_BIN");
  for (const directory of (process.env.PATH || "").split(path.delimiter)) {
    const candidate = path.join(directory || ".", "swipl");
    try { return absoluteExecutable(candidate, "resolved swipl"); } catch { /* keep searching */ }
  }
  throw new Error("a resolved executable swipl binary is required for codex-seatbelt denial preflight");
}
function stringLeaves(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) for (const item of value) stringLeaves(item, out);
  else if (value && typeof value === "object") for (const item of Object.values(value)) stringLeaves(item, out);
  return out;
}
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function parseCodexJsonl(stdoutFile, prohibitedPaths) {
  const raw = fs.readFileSync(stdoutFile, "utf8");
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (!lines.length) throw new Error("Codex JSONL trace is empty");
  let events;
  try { events = lines.map(line => JSON.parse(line)); }
  catch { throw new Error("Codex JSONL trace is malformed"); }
  const protectedPaths = [...new Set(prohibitedPaths.map(value => path.resolve(value)))];
  const exposed = [];
  for (const event of events) for (const text of stringLeaves(event)) for (const protectedPath of protectedPaths) {
    if (text === protectedPath || text.includes(protectedPath)) exposed.push(protectedPath);
  }
  if (exposed.length) throw new Error(`prohibited host path exposed in Codex JSONL: ${[...new Set(exposed)].join(", ")}`);
  const toolEvents = events.filter(event => /(?:command_execution|function_call|\btool\b)/i.test(JSON.stringify(event))).length;
  if (toolEvents) throw new Error(`Codex Seatbelt transport rejects tool or command events: ${toolEvents}`);
  const completed = events.filter(event => event && event.type === "turn.completed");
  if (completed.length !== 1 || !completed[0].usage || typeof completed[0].usage !== "object") throw new Error("Codex JSONL must contain exactly one completed turn with native usage");
  const usage = completed[0].usage;
  for (const key of ["input_tokens", "output_tokens"]) if (!Number.isSafeInteger(usage[key]) || usage[key] < 0) throw new Error("Codex native usage counter is invalid");
  return Object.freeze({ usage: Object.freeze({ input_tokens: usage.input_tokens, output_tokens: usage.output_tokens, total_tokens: usage.input_tokens + usage.output_tokens }), inspection: Object.freeze({ tool_events_observed: 0, prohibited_path_exposure: false }) });
}
function parseP2CodexJsonl(stdoutFile, prohibitedPaths, brokerPath) {
  const raw = fs.readFileSync(stdoutFile, "utf8"), lines = raw.split(/\r?\n/).filter(Boolean);
  if (!lines.length) throw new Error("Codex JSONL trace is empty");
  let events;
  try { events = lines.map(line => JSON.parse(line)); } catch { throw new Error("Codex JSONL trace is malformed"); }
  const sealedBroker = path.resolve(brokerPath);
  const brokerState = path.dirname(sealedBroker);
  // A native command is emitted twice by Codex: item.started and
  // item.completed.  Treat that pair as one action only when the lifecycle
  // identity and the complete validated command payload agree byte-for-byte.
  // Counting text that merely mentions command_execution would admit forged
  // or partial traces, while accepting only the completed event would hide a
  // missing lifecycle half.
  const lifecycleEvents = events.filter(event => event && /^item\.(?:started|completed)$/.test(event.type) && event.item && event.item.type === "command_execution");
  const otherActionEvents = events.filter(event => {
    if (lifecycleEvents.includes(event)) return false;
    return /(?:command_execution|function_call|\btool\b)/i.test(JSON.stringify(event));
  });
  if (otherActionEvents.length) throw new Error(`P2 trace contains foreign or unsupported action events: ${otherActionEvents.length}`);
  if (lifecycleEvents.length === 0) throw new Error("P2 trace must contain exactly one broker lifecycle pair, got 0");
  if (lifecycleEvents.length !== 2) throw new Error(`P2 trace must contain exactly one broker lifecycle pair, got ${lifecycleEvents.length} events`);
  const started = lifecycleEvents.filter(event => event.type === "item.started");
  const completedLifecycle = lifecycleEvents.filter(event => event.type === "item.completed");
  if (started.length !== 1 || completedLifecycle.length !== 1) throw new Error("P2 trace must contain one item.started and one item.completed broker event");
  const startedItem = started[0].item;
  const completedItem = completedLifecycle[0].item;
  if (typeof startedItem.id !== "string" || startedItem.id.length === 0 || completedItem.id !== startedItem.id) throw new Error("P2 trace broker lifecycle events must share the same item.id");
  const validateCommandIdentity = (candidate) => {
    const command = candidate && candidate.command;
    const args = candidate && candidate.args;
    const shellLine = typeof command === "string" && new RegExp(`^/bin/zsh -(?:c|lc) ${escapeRegExp(sealedBroker)}$`).test(command);
    const argv = command === "/bin/zsh" && Array.isArray(args) && args.length === 2 && /^(?:-c|-lc)$/.test(args[0]) && args[1] === sealedBroker;
    if (!shellLine && !argv) throw new Error("P2 trace contains a foreign or parameterized command; expected /bin/zsh -c|-lc with the sealed broker path");
    const runtimeFields = new Set(["status", "exit_code", "aggregated_output"]);
    for (const [key, value] of Object.entries(candidate || {})) {
      if (key !== "id" && key !== "type" && key !== "command" && key !== "args" && !runtimeFields.has(key)) throw new Error("P2 trace contains unexpected command fields");
      if (key === "args" && !argv && value !== undefined) throw new Error("P2 trace contains command arguments outside the sealed shell wrapper");
    }
    return JSON.stringify({ type: candidate.type, command, args: argv ? args : undefined });
  };
  const startedIdentity = validateCommandIdentity(startedItem);
  const completedIdentity = validateCommandIdentity(completedItem);
  if (startedIdentity !== completedIdentity) throw new Error("P2 trace broker lifecycle events must have the same command identity");
  const commandEvent = started[0];
  const item = startedItem;
  const command = item && item.command;
  const args = item && item.args;
  const shellLine = typeof command === "string" && new RegExp(`^/bin/zsh -(?:c|lc) ${escapeRegExp(sealedBroker)}$`).test(command);
  const argv = command === "/bin/zsh" && Array.isArray(args) && args.length === 2 && /^(?:-c|-lc)$/.test(args[0]) && args[1] === sealedBroker;
  // Codex may echo the broker's private state files in its command event or
  // completion metadata. Permit only those two files from this run's state;
  // every other absolute path is evidence of scope escape. This check is
  // deliberately after command validation so a foreign command remains a
  // foreign-command failure, not a path-classification side effect.
  const sealedProgram = path.join(brokerState, "sealed-program.pl");
  const brokerReceipt = path.join(brokerState, "broker-receipt.txt");
  const allowedP2PathValue = value => value === sealedBroker || value === sealedProgram || value === brokerReceipt || new RegExp(`^/bin/zsh -(?:c|lc) ${escapeRegExp(sealedBroker)}$`).test(value);
  const absolutePathLike = /(^|\s)\/(?:[^\s"']+)/;
  const protectedPaths = [...new Set(prohibitedPaths.map(value => path.resolve(value)))];
  // `/bin/zsh` and the broker state directory are admissible only as parts of
  // the already validated native command wrapper.  Do not let the generic
  // path scan turn them into standalone allowlisted text elsewhere in JSONL.
  const traceLeaves = (value, out = [], commandItem = item, insideCommandItem = false) => {
    if (typeof value === "string") { out.push(value); return out; }
    if (Array.isArray(value)) { for (const child of value) traceLeaves(child, out, commandItem, insideCommandItem); return out; }
    if (value && typeof value === "object") for (const [key, child] of Object.entries(value)) {
      if (insideCommandItem && (key === "command" || key === "args")) continue;
      traceLeaves(child, out, commandItem, insideCommandItem || child === commandItem || (child && child.type === "command_execution"));
    }
    return out;
  };
  for (const event of events) for (const value of traceLeaves(event)) {
    if (allowedP2PathValue(value)) continue;
    const pathTokens = value.match(/\/[^\s"']+/g) || [];
    if (pathTokens.length && pathTokens.every(token => allowedP2PathValue(token))) continue;
    for (const protectedPath of protectedPaths) if (value === protectedPath || value.includes(protectedPath)) throw new Error(`prohibited host path exposed in Codex JSONL: ${protectedPath}`);
    if (absolutePathLike.test(value) && !allowedP2PathValue(value)) throw new Error(`P2 trace exposes a foreign or unexpected state path: ${value}`);
  }
  const completed = events.filter(event => event && event.type === "turn.completed");
  if (completed.length !== 1 || !completed[0].usage || typeof completed[0].usage !== "object") throw new Error("Codex JSONL must contain exactly one completed turn with native usage");
  const usage = completed[0].usage;
  for (const key of ["input_tokens", "output_tokens"]) if (!Number.isSafeInteger(usage[key]) || usage[key] < 0) throw new Error("Codex native usage counter is invalid");
  return Object.freeze({ usage: Object.freeze({ input_tokens: usage.input_tokens, output_tokens: usage.output_tokens, total_tokens: usage.input_tokens + usage.output_tokens }), inspection: Object.freeze({ tool_events_observed: 1, broker_action: brokerPath, prohibited_path_exposure: false }) });
}
function writeP2Broker(run, item, swiplPath) {
  const programFile = path.join(run.state_dir, "sealed-program.pl"), receiptFile = path.join(run.state_dir, "broker-receipt.txt"), brokerFile = path.join(run.state_dir, "query-broker.sh");
  const query = `${item.case.formal_world.query.predicate}(${item.case.formal_world.query.args.join(",")})`;
  const program = `${formalProgram(item.case.formal_world)}\n:- initialization(main).\nmain :- ((${query}) -> writeln('BROKER_RESULT: entailed') ; writeln('BROKER_RESULT: unknown')), halt.\n`;
  fs.writeFileSync(programFile, program, { flag: "wx", mode: 0o400 });
  const script = `#!/bin/sh\nif [ "$#" -ne 0 ]; then exit 64; fi\nexec ${JSON.stringify(swiplPath)} --quiet --nosignals -s ${JSON.stringify(programFile)} > ${JSON.stringify(receiptFile)}\n`;
  fs.writeFileSync(brokerFile, script, { flag: "wx", mode: 0o700 }); fs.chmodSync(brokerFile, 0o700);
  return Object.freeze({ programFile, receiptFile, brokerFile });
}
function readBrokerResult(file) {
  if (!fs.existsSync(file)) throw new Error("P2 broker receipt is missing");
  const value = fs.readFileSync(file, "utf8").trim();
  if (value !== "BROKER_RESULT: entailed" && value !== "BROKER_RESULT: unknown") throw new Error("P2 broker receipt is malformed");
  return value.slice("BROKER_RESULT: ".length);
}
function parseCodexFinalOutput(file) {
  let final;
  try { final = JSON.parse(fs.readFileSync(file, "utf8")); }
  catch { throw new Error("Codex final output is malformed JSON"); }
  exactKeys(final, ["answer"], "Codex final output");
  if (typeof final.answer !== "string") throw new Error("Codex final output.answer must be text");
  return final.answer;
}
function invokeCodex({ invocation, spawnImpl = childProcess.spawn }) {
  if (typeof spawnImpl !== "function") throw new Error("spawnImpl must be a function");
  return new Promise((resolve, reject) => {
    let child, stdout = "", stderr = "", settled = false;
    const fail = error => { if (!settled) { settled = true; reject(error); } };
    try { child = spawnImpl(invocation.command, invocation.args, { cwd: invocation.cwd, env: invocation.env, stdio: ["pipe", "pipe", "pipe"] }); } catch (error) { fail(error); return; }
    if (!child || !child.stdin || !child.stdout || !child.stderr || typeof child.on !== "function") { fail(new Error("Seatbelt Codex spawn must provide stdio")); return; }
    child.stdout.on("data", chunk => { stdout += String(chunk); });
    child.stderr.on("data", chunk => { stderr += String(chunk); });
    child.on("error", fail);
    child.on("close", code => {
      try {
        writeExclusive(invocation.stdout_file, stdout); writeExclusive(invocation.stderr_file, stderr);
        if (code !== 0) throw new Error(`Seatbelt Codex exited with code ${code}`);
        if (!fs.existsSync(invocation.final_output_file)) throw new Error("Codex final output capture is missing");
        resolve(Object.freeze({ stdout_file: invocation.stdout_file, stderr_file: invocation.stderr_file, final_output_file: invocation.final_output_file }));
      } catch (error) { fail(error); }
    });
    try { child.stdin.end(fs.readFileSync(invocation.stdin_file)); } catch (error) { fail(error); }
  });
}
function codexSeatbeltPreflight({ rawRoot, codexPath, swiplPath }) {
  const preflightRun = seatbelt.createFreshSealedRunRoot(rawRoot);
  const memoryFile = path.join(os.homedir(), ".codex", "memories", "MEMORY.md");
  const report = seatbelt.offlineProbeReport({ run: preflightRun, codexPath, repositoryFile: path.join(__dirname, "package.json"), memoryFile, datasetOrEvaluatorFile: __filename, outsideWriteFile: path.join(rawRoot, "preflight-must-not-write") });
  const denialRun = seatbelt.createFreshSealedRunRoot(rawRoot);
  const profile = seatbelt.createSeatbeltProfile({ runRoot: denialRun.run_root, inputDir: denialRun.input_dir, outputDir: denialRun.output_dir, stateDir: denialRun.state_dir, workspaceDir: denialRun.workspace_dir, codexPath });
  const denied = seatbelt.runSeatbeltProbe({ profile, cwd: denialRun.run_root, command: swiplPath, args: ["--version"] });
  if (denied.status === 0) throw new Error("Seatbelt preflight did not deny resolved swipl --version");
  return Object.freeze({ status: "codex-seatbelt-preflight-passed-no-provider-call", swipl_denial_status: denied.status, preflight_run: preflightRun.run_root, denial_run: denialRun.run_root, report_status: report.status });
}
function protectedCodexPaths({ fixtureFile, configFile, authFile, swiplPath, invocation }) {
  return Object.freeze([...new Set([__dirname, fixtureFile, configFile, authFile, swiplPath, path.join(os.homedir(), ".codex", "memories"), invocation.private_auth_file, invocation.private_auth_file && path.dirname(invocation.private_auth_file)].filter(Boolean).map(value => path.resolve(value)))]);
}
async function collectCodexSeatbelt({ fixtureLoaded, configLoaded, config, model, rawRoot, codexPath, authFile, spawnImpl, preflight = codexSeatbeltPreflight, swiplPath }) {
  const codex = absoluteExecutable(codexPath, "codex_path");
  const auth = exactAuthFile(authFile);
  const swipl = resolveSwiplBinary(swiplPath);
  fs.mkdirSync(rawRoot, { mode: 0o700 });
  const preflightEvidence = preflight({ rawRoot, codexPath: codex, swiplPath: swipl });
  writeExclusive(path.join(rawRoot, "seatbelt-preflight.json"), stable(preflightEvidence));
  const records = [];
  for (const item of counterbalancedPlan(fixtureLoaded.fixture)) {
    const run = seatbelt.createFreshSealedRunRoot(rawRoot);
    const prompt = item.case.prompts[item.condition.toLowerCase()];
    const sealed = seatbelt.writeSealedInput(run, { prompt, schema: stable(FINAL_ANSWER_SCHEMA) });
    let invocation, rawResponse, response = null, transportError = null, inspection = null;
    try {
      invocation = seatbelt.buildCodexInvocation({ run, sealed, codexPath: codex, model, authFile: auth });
      const raw = await invokeCodex({ invocation, spawnImpl });
      const parsed = parseCodexJsonl(raw.stdout_file, protectedCodexPaths({ fixtureFile: fixtureLoaded.file, configFile: configLoaded.file, authFile: auth, swiplPath: swipl, invocation }));
      response = { answer: parseCodexFinalOutput(raw.final_output_file), usage: parsed.usage };
      inspection = parsed.inspection;
      rawResponse = raw.final_output_file;
    } catch (error) {
      transportError = String(error && (error.stack || error.message) || error);
      const errorFile = path.join(run.output_dir, "collector-rejection.txt");
      if (!fs.existsSync(errorFile)) writeExclusive(errorFile, transportError + "\n");
      rawResponse = fs.existsSync(path.join(run.output_dir, "final-output.txt")) ? path.join(run.output_dir, "final-output.txt") : fs.existsSync(path.join(run.output_dir, "codex-stdout.jsonl")) ? path.join(run.output_dir, "codex-stdout.jsonl") : errorFile;
    }
    const score = scoreAnswer(response && response.answer, item.case.oracle.label);
    const record = { record_id: `${item.case.case_id}-${item.condition.toLowerCase()}`, case_id: item.case.case_id, condition: item.condition, counterbalanced_order: item.pair_order, fixture_sha256: fixtureLoaded.sha256, config_sha256: configLoaded.sha256, prompt_sha256: sha256(prompt), prompt: { ref: localRef(rawRoot, sealed.prompt_file), sha256: sha256(fs.readFileSync(sealed.prompt_file, "utf8")) }, raw_response: { ref: localRef(rawRoot, rawResponse), sha256: sha256(fs.readFileSync(rawResponse, "utf8")) }, raw: { schema: { ref: localRef(rawRoot, sealed.schema_file), sha256: sha256(fs.readFileSync(sealed.schema_file, "utf8")) }, stdout: fs.existsSync(path.join(run.output_dir, "codex-stdout.jsonl")) ? { ref: localRef(rawRoot, path.join(run.output_dir, "codex-stdout.jsonl")), sha256: sha256(fs.readFileSync(path.join(run.output_dir, "codex-stdout.jsonl"), "utf8")) } : null, stderr: fs.existsSync(path.join(run.output_dir, "codex-stderr.txt")) ? { ref: localRef(rawRoot, path.join(run.output_dir, "codex-stderr.txt")), sha256: sha256(fs.readFileSync(path.join(run.output_dir, "codex-stderr.txt"), "utf8")) } : null, final_output: fs.existsSync(path.join(run.output_dir, "final-output.txt")) ? { ref: localRef(rawRoot, path.join(run.output_dir, "final-output.txt")), sha256: sha256(fs.readFileSync(path.join(run.output_dir, "final-output.txt"), "utf8")) } : null }, provider: "codex-seatbelt", model: config.model, sampling: config.sampling, retry_policy: config.retry_policy, usage: response ? response.usage : null, inspection, parsed_answer: score.parsed_answer, score, transport_error: transportError };
    writeExclusive(path.join(run.output_dir, "record.json"), stable(record)); records.push(Object.freeze(record));
  }
  const result = aggregate(records, { file_sha256: fixtureLoaded.sha256, schema_version: fixtureLoaded.fixture.schema_version, case_count: fixtureLoaded.fixture.cases.length }, { file_sha256: configLoaded.sha256, schema_version: config.schema_version, provider: config.provider, model: config.model, sampling: config.sampling, retry_policy: config.retry_policy });
  const aggregateArtifact = writeExclusive(path.join(rawRoot, "aggregate-not-a-cdr-receipt.json"), stable(result));
  return Object.freeze({ aggregate: result, aggregate_file: aggregateArtifact.file, raw_root: rawRoot });
}
async function collectCodexSeatbeltP2(options, { traceGated = false } = {}) {
  const { fixtureLoaded, configLoaded, config, model, rawRoot, codexPath, authFile, spawnImpl, preflight = codexSeatbeltPreflight, swiplPath } = options;
  const codex = absoluteExecutable(codexPath, "codex_path"), auth = exactAuthFile(authFile), swipl = resolveSwiplBinary(swiplPath);
  fs.mkdirSync(rawRoot, { mode: 0o700 });
  writeExclusive(path.join(rawRoot, traceGated ? "trace-gate-mode.json" : "seatbelt-preflight.json"), stable(traceGated ? { mode: "trace-gated-native-codex-sandbox", outer_seatbelt: false, p0_p1: "reject any tool_or_command JSONL event", p2: "require exactly one no-argument private broker event" } : preflight({ rawRoot, codexPath: codex, swiplPath: swipl })));
  const records = [];
  for (const item of counterbalancedPlan(fixtureLoaded.fixture).filter(entry => entry.condition === "P0")) for (const condition of THREE_CONDITION_ORDER) {
    const run = seatbelt.createFreshSealedRunRoot(rawRoot), broker = condition === "P2" ? writeP2Broker(run, item, swipl) : null;
    const prompt = condition === "P2" ? `${item.case.prompts.p1}\nUse exactly one private query broker action, with no arguments: ${broker.brokerFile}. Then answer in the required RESULT envelope.` : item.case.prompts[condition.toLowerCase()];
    const sealed = seatbelt.writeSealedInput(run, { prompt, schema: stable(FINAL_ANSWER_SCHEMA) });
    let response = null, rawResponse, transportError = null, inspection = null;
    try {
      const invocation = traceGated ? seatbelt.buildTraceAuditedInvocation({ run, sealed, codexPath: codex, model, authFile: auth }) : seatbelt.buildCodexInvocation({ run, sealed, codexPath: codex, model, authFile: auth, extraRuntimeFiles: condition === "P2" ? [swipl] : [] });
      const raw = await invokeCodex({ invocation, spawnImpl });
      const paths = protectedCodexPaths({ fixtureFile: fixtureLoaded.file, configFile: configLoaded.file, authFile: auth, swiplPath: swipl, invocation });
      const parsed = condition === "P2" ? parseP2CodexJsonl(raw.stdout_file, paths, broker.brokerFile) : parseCodexJsonl(raw.stdout_file, paths);
      if (condition === "P2") { const brokerLabel = readBrokerResult(broker.receiptFile), direct = await runPrologOracle(item.case.formal_world); if (brokerLabel !== direct.label) throw new Error("P2 broker result disagrees with direct SWI recomputation"); }
      response = { answer: parseCodexFinalOutput(raw.final_output_file), usage: parsed.usage }; inspection = parsed.inspection; rawResponse = raw.final_output_file;
    } catch (error) {
      transportError = String(error && (error.stack || error.message) || error); const errorFile = path.join(run.output_dir, "collector-rejection.txt"); if (!fs.existsSync(errorFile)) writeExclusive(errorFile, transportError + "\n"); rawResponse = errorFile;
    }
    const score = scoreAnswer(response && response.answer, item.case.oracle.label);
    const record = { record_id: `${item.case.case_id}-${condition.toLowerCase()}`, case_id: item.case.case_id, condition, counterbalanced_order: item.pair_order, fixture_sha256: fixtureLoaded.sha256, config_sha256: configLoaded.sha256, prompt_sha256: sha256(prompt), prompt: { ref: localRef(rawRoot, sealed.prompt_file), sha256: sha256(fs.readFileSync(sealed.prompt_file, "utf8")) }, raw_response: { ref: localRef(rawRoot, rawResponse), sha256: sha256(fs.readFileSync(rawResponse, "utf8")) }, provider: traceGated ? "codex-trace-gated-p2" : "codex-seatbelt-p2", model: config.model, sampling: config.sampling, retry_policy: config.retry_policy, usage: response ? response.usage : null, inspection, parsed_answer: score.parsed_answer, score, transport_error: transportError };
    writeExclusive(path.join(run.output_dir, "record.json"), stable(record)); records.push(Object.freeze(record));
  }
  const result = aggregate(records, { file_sha256: fixtureLoaded.sha256, schema_version: fixtureLoaded.fixture.schema_version, case_count: fixtureLoaded.fixture.cases.length }, { file_sha256: configLoaded.sha256, schema_version: config.schema_version, provider: config.provider, model: config.model, sampling: config.sampling, retry_policy: config.retry_policy });
  const aggregateArtifact = writeExclusive(path.join(rawRoot, "aggregate-not-a-cdr-receipt.json"), stable(result)); return Object.freeze({ aggregate: result, aggregate_file: aggregateArtifact.file, raw_root: rawRoot });
}
async function collectLive({ fixtureInput, configInput, allowLiveProvider, provider = "openai-api", model, rawRoot, providerFactory, codexPath, authFile, spawnImpl, preflight, swiplPath }) {
  const fixtureLoaded = canonicalVerifiedInput(typeof fixtureInput === "string" ? loadFixture(fixtureInput) : fixtureInput, "fixture");
  validateFixture(fixtureLoaded.fixture);
  const configLoaded = canonicalVerifiedInput(typeof configInput === "string" ? loadConfig(configInput, fixtureLoaded.sha256) : configInput, "config");
  const config = validateConfig(configLoaded.config, fixtureLoaded.sha256);
  assertLiveGates({ allowLiveProvider, model, rawRoot, provider });
  if (model !== config.model) throw new Error("--model must match config.model");
  if (provider !== config.provider) throw new Error("selected provider must match config.provider");
  if (provider === "codex-seatbelt") return collectCodexSeatbelt({ fixtureLoaded, configLoaded, config, model, rawRoot, codexPath, authFile, spawnImpl, preflight, swiplPath });
  if (provider === "codex-seatbelt-p2") return collectCodexSeatbeltP2({ fixtureLoaded, configLoaded, config, model, rawRoot, codexPath, authFile, spawnImpl, preflight, swiplPath });
  if (provider === "codex-trace-gated-p2") return collectCodexSeatbeltP2({ fixtureLoaded, configLoaded, config, model, rawRoot, codexPath, authFile, spawnImpl, preflight, swiplPath }, { traceGated: true });
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
    else if (["--fixture", "--config", "--provider", "--model", "--raw-root", "--codex-path", "--auth-file"].includes(token) && argv[index + 1]) result[{ "--fixture": "fixture", "--config": "config", "--provider": "provider", "--model": "model", "--raw-root": "rawRoot", "--codex-path": "codexPath", "--auth-file": "authFile" }[token]] = argv[++index];
    else throw new Error("usage: --fixture ABSOLUTE_FILE --config ABSOLUTE_FILE [--allow-live-provider --provider openai-api|codex-seatbelt --model MODEL --raw-root FRESH_ABSOLUTE_DIR --codex-path ABSOLUTE_FILE --auth-file ABSOLUTE_AUTH_JSON]");
  }
  return result;
}
module.exports = { CONFIG_SCHEMA_VERSION, EVALUATOR_SCHEMA_VERSION, RUN_SCHEMA_VERSION, FINAL_ANSWER_SCHEMA, aggregate, collectLive, codexSeatbeltPreflight, counterbalancedPlan, invokeCodex, loadConfig, loadFixture, parseAnswer, parseArgs, parseCodexFinalOutput, parseCodexJsonl, parseP2CodexJsonl, readBrokerResult, requireFreshRawRoot, resolveSwiplBinary, scoreAnswer, validateConfig, validateFixture };

if (require.main === module) {
  (async () => {
    const args = parseArgs(process.argv.slice(2));
    const fixture = loadFixture(args.fixture), config = loadConfig(args.config, fixture.sha256);
    if (!args.allowLiveProvider) return console.log(JSON.stringify({ status: "offline-validated-no-provider-call", provider_calls: 0, fixture_sha256: fixture.sha256, config_sha256: config.sha256, calls_planned: 48 }));
    const result = await collectLive({ fixtureInput: fixture, configInput: config, allowLiveProvider: true, provider: args.provider, model: args.model, rawRoot: args.rawRoot, codexPath: args.codexPath, authFile: args.authFile, providerFactory: args.provider === "openai-api" ? ({ config: liveConfig }) => createOpenAIAnsweringProvider({ config: liveConfig }) : undefined });
    console.log(JSON.stringify({ status: "collected-not-a-cdr-receipt", records: result.aggregate.calls_recorded, aggregate: result.aggregate_file }));
  })().catch(error => { console.error(`representation-live-evaluator: ${error.stack || error.message}`); process.exitCode = 1; });
}
