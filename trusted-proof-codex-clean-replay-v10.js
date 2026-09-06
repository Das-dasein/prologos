"use strict";

// v10 replays only proof consumption: P1 is supplied a precomputed trusted
// result.  It intentionally does not expose a Prolog tool, an AST, the host
// checkout, or the hidden scoring contract to the answering process.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const childProcess = require("node:child_process");
const { assembleCondition, immutableInputs } = require("./trusted-proof-preflight");
const { FINAL_SCHEMA } = require("./providers/codex-exec-answering");
const { stable } = require("./.cdr/waves/cognitive-proof-eval-v1/validate-equal-budget-slots-v1");
const { trustedRegistry } = require("./.cdr/waves/cognitive-proof-eval-v1/validate-codex-exec-receipt-intake-v8");
const { orderMap } = require("./.cdr/waves/cognitive-proof-eval-v1/validate-codex-diagnostic-v9");
const seatbelt = require("./trusted-proof-codex-seatbelt-v10");
const TRACE_AUDIT_PREAMBLE = "You are answering a sealed logic-memory task. Answer the query directly using only the text below. Do not use shell commands, tools, filesystem, network, or external information.\n\n";

const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const readJson = file => JSON.parse(fs.readFileSync(file, "utf8"));
const exact = (value, keys, label) => {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).sort().join(",") !== [...keys].sort().join(",")) throw new Error(`${label} shape is invalid`);
};
const within = (parent, child) => child === parent || child.startsWith(`${parent}${path.sep}`);
const artifactRef = (root, file) => ({ ref: `local://${path.relative(root, file)}`, sha256: sha256(fs.readFileSync(file)) });
const freshDirectory = value => typeof value === "string" && path.isAbsolute(value) && !fs.existsSync(value) && fs.existsSync(path.dirname(value)) && fs.statSync(path.dirname(value)).isDirectory();

function nativeUsage(stdoutFile) {
  const events = fs.readFileSync(stdoutFile, "utf8").split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
  const complete = events.filter(event => event && event.type === "turn.completed");
  if (complete.length !== 1 || !complete[0].usage || typeof complete[0].usage !== "object") throw new Error("Codex JSONL must contain exactly one completed turn with native usage");
  const usage = complete[0].usage;
  for (const key of ["input_tokens", "output_tokens"]) if (!Number.isSafeInteger(usage[key]) || usage[key] < 0) throw new Error("Codex native usage counter is invalid");
  const optional = key => usage[key] === undefined ? null : usage[key];
  for (const key of ["cached_input_tokens", "cache_write_input_tokens"]) if (optional(key) !== null && (!Number.isSafeInteger(optional(key)) || optional(key) < 0)) throw new Error("Codex native cache counter is invalid");
  return Object.freeze({ input_tokens: usage.input_tokens, output_tokens: usage.output_tokens, total_tokens: usage.input_tokens + usage.output_tokens, cached_input_tokens: optional("cached_input_tokens"), cache_write_input_tokens: optional("cache_write_input_tokens") });
}

function strings(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) for (const item of value) strings(item, out);
  else if (value && typeof value === "object") for (const item of Object.values(value)) strings(item, out);
  return out;
}
function inspectRawJsonl({ stdoutFile, prohibitedPaths }) {
  if (!Array.isArray(prohibitedPaths) || prohibitedPaths.some(value => typeof value !== "string" || !path.isAbsolute(value))) throw new Error("prohibited paths must be absolute paths");
  const events = fs.readFileSync(stdoutFile, "utf8").split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
  const material = [...new Set(prohibitedPaths.map(value => path.resolve(value)))];
  const exposed = [];
  for (const event of events) for (const text of strings(event)) for (const target of material) {
    if (text === target || text.includes(target)) exposed.push(target);
  }
  if (exposed.length) throw new Error(`prohibited host path exposed in Codex JSONL: ${[...new Set(exposed)].join(", ")}`);
  const toolEvents = events.filter(event => JSON.stringify(event).includes("command_execution") || JSON.stringify(event).includes("tool")).length;
  if (toolEvents) throw new Error(`trace-audited replay rejects tool or command events: ${toolEvents}`);
  return Object.freeze({ tool_events_observed: toolEvents, prohibited_path_exposure: false });
}

async function sealConfig(config, model) {
  const keys = ["provider", "source_commit", "model", "base_prompt_sha256", "wrapper_prompt_sha256", "sampling", "retry_policy", "dataset_sha256", "slot_registration_file_sha256", "slot_registration_sha256", "codex_path", "auth_file"];
  exact(config, keys, "v10 config");
  const registry = await trustedRegistry();
  if (config.provider !== "codex-exec" || config.model !== model || config.source_commit !== registry.source_commit || config.dataset_sha256 !== registry.dataset.sha256 || config.slot_registration_file_sha256 !== registry.config_authority.slot_registration_file_sha256 || config.slot_registration_sha256 !== registry.slot_registration.sha256 || config.base_prompt_sha256 !== registry.wire.template_identities.base_prompt_sha256 || config.wrapper_prompt_sha256 !== registry.wire.template_identities.wrapper_prompt_sha256 || stable(config.sampling) !== stable(registry.config_authority.sampling) || config.retry_policy !== registry.config_authority.retry_policy) throw new Error("v10 config does not match pinned Codex authority");
  if (typeof config.codex_path !== "string" || !path.isAbsolute(config.codex_path) || !fs.existsSync(config.codex_path) || !fs.statSync(config.codex_path).isFile()) throw new Error("v10 config.codex_path must be an existing absolute file");
  if (typeof config.auth_file !== "string" || !path.isAbsolute(config.auth_file) || path.basename(config.auth_file) !== "auth.json" || !fs.existsSync(config.auth_file) || !fs.statSync(config.auth_file).isFile()) throw new Error("v10 config.auth_file must be an existing exact auth.json file");
  return Object.freeze({ ...config, codex_path: fs.realpathSync(config.codex_path), auth_file: fs.realpathSync(config.auth_file) });
}

function invoke({ invocation, spawnImpl = childProcess.spawn }) {
  if (typeof spawnImpl !== "function") throw new Error("spawnImpl must be a function");
  return new Promise((resolve, reject) => {
    let child; let stdout = ""; let stderr = ""; let settled = false;
    const fail = error => { if (!settled) { settled = true; reject(error); } };
    try { child = spawnImpl(invocation.command, invocation.args, { cwd: invocation.cwd, env: invocation.env, stdio: ["pipe", "pipe", "pipe"] }); } catch (error) { fail(error); return; }
    if (!child || !child.stdin || !child.stdout || !child.stderr || typeof child.on !== "function") { fail(new Error("Seatbelt Codex spawn must provide stdio")); return; }
    child.stdout.on("data", chunk => { stdout += String(chunk); }); child.stderr.on("data", chunk => { stderr += String(chunk); });
    child.on("error", fail);
    child.on("close", code => {
      try {
        fs.writeFileSync(invocation.stdout_file, stdout, { flag: "wx", mode: 0o600 }); fs.writeFileSync(invocation.stderr_file, stderr, { flag: "wx", mode: 0o600 });
        if (code !== 0) throw new Error(`Seatbelt Codex exited with code ${code}: ${(stderr.trim() || stdout.trim() || "no diagnostic output").slice(0, 4000)}`);
        if (!fs.existsSync(invocation.final_output_file)) throw new Error("Codex final output capture is missing");
        const final = JSON.parse(fs.readFileSync(invocation.final_output_file, "utf8"));
        if (!final || typeof final !== "object" || Array.isArray(final) || Object.keys(final).join(",") !== "answer" || typeof final.answer !== "string" || !final.answer.trim()) throw new Error("Codex final output must be a non-empty answer object");
        if (!settled) { settled = true; resolve(Object.freeze({ stdout_file: invocation.stdout_file, stderr_file: invocation.stderr_file, final_output_file: invocation.final_output_file })); }
      } catch (error) { fail(error); }
    });
    try { child.stdin.end(fs.readFileSync(invocation.stdin_file)); } catch (error) { fail(error); }
  });
}

function protectedPaths(inputs) {
  return Object.freeze([...new Set([path.resolve(__dirname), path.resolve(__dirname, ".cdr", "waves", "cognitive-proof-eval-v1"), path.resolve(inputs.dataset_path), path.resolve(inputs.registration_path), path.resolve(require("node:os").homedir(), ".codex", "memories")])]);
}

async function collectCleanReplay({ config, root, allowLiveProvider, provider, model, spawnImpl } = {}) {
  if (allowLiveProvider !== true || provider !== "codex-exec") throw new Error("collection requires explicit --provider codex-exec and --allow-live-provider");
  if (!freshDirectory(root)) throw new Error("clean replay root must be a fresh absolute directory");
  const sealedConfig = await sealConfig(config, model), inputs = immutableInputs(), registry = await trustedRegistry(), map = orderMap();
  fs.mkdirSync(root, { mode: 0o700 });
  const records = [], protectedHostPaths = protectedPaths(inputs);
  for (const fixture of [...inputs.dataset.cases].sort((a, b) => a.id.localeCompare(b.id))) for (const [index, condition] of map[fixture.id].entries()) {
    const assembled = await assembleCondition({ fixture, inputs, config: sealedConfig, condition });
    const run = seatbelt.createFreshSealedRunRoot(root);
    const prompt = `${TRACE_AUDIT_PREAMBLE}${assembled.prompt}`;
    const sealed = seatbelt.writeSealedInput(run, { prompt, schema: `${JSON.stringify(FINAL_SCHEMA)}\n` });
    const invocation = seatbelt.buildTraceAuditedInvocation({ run, sealed, codexPath: sealedConfig.codex_path, model, authFile: sealedConfig.auth_file });
    const raw = await invoke({ invocation, spawnImpl });
    const inspection = inspectRawJsonl({ stdoutFile: raw.stdout_file, prohibitedPaths: protectedHostPaths });
    records.push({ record_id: `${fixture.id}-${condition.toLowerCase()}`, case_id: fixture.id, condition, condition_order: map[fixture.id].join(","), order_ordinal: index + 1, prompt_sha256: sha256(prompt), trusted_proof_sha256: assembled.trusted_result ? sha256(stable(assembled.trusted_result)) : null, raw: { prompt: artifactRef(root, sealed.prompt_file), stdout: artifactRef(root, raw.stdout_file), stderr: artifactRef(root, raw.stderr_file), final_output: artifactRef(root, raw.final_output_file) }, native_usage: nativeUsage(raw.stdout_file), inspection });
  }
  const artifact = { schema_version: "codex-clean-proof-replay-v10", artifact_kind: "trace_audited_diagnostic_candidate", status: "trace-audited-diagnostic-candidate-not-an-effect-result", source_commit: registry.source_commit, run: { provider: "codex-exec", model, config_sha256: sha256(stable(sealedConfig)), isolation: "fresh-root-codex-workspace-write-trace-audit-v10", execution_guard_sha256: sha256(TRACE_AUDIT_PREAMBLE), credential_surface: "exact-auth-file-visible-not-hermetic" }, order_map: map, records };
  const file = path.join(root, "clean-proof-replay-v10.json"); fs.writeFileSync(file, `${JSON.stringify(artifact, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  return Object.freeze({ artifact_file: file, records: records.length, status: artifact.status });
}

function usage() { return "usage: --provider codex-exec --allow-live-provider --config ABSOLUTE_FILE --model MODEL --root FRESH_ABSOLUTE_DIR"; }
function parseArgs(argv) { const out = {}; for (let index = 0; index < argv.length; index += 1) { const token = argv[index]; if (token === "--allow-live-provider") { if (out.allowLiveProvider) throw new Error(usage()); out.allowLiveProvider = true; continue; } const key = { "--provider": "provider", "--config": "configPath", "--model": "model", "--root": "root" }[token]; if (!key || out[key] !== undefined || !argv[index + 1] || argv[index + 1].startsWith("--")) throw new Error(usage()); out[key] = argv[++index]; } return out; }
async function runCli({ argv, collector = collectCleanReplay, stdout = process.stdout } = {}) {
  if (!Array.isArray(argv)) throw new Error("argv must be an array");
  if (!argv.length) { stdout.write(`${JSON.stringify({ status: "offline-no-default-provider", provider_calls: 0 })}\n`); return; }
  const args = parseArgs(argv);
  if (!args.allowLiveProvider || args.provider !== "codex-exec" || !args.configPath || !args.model || !args.root || !path.isAbsolute(args.configPath)) throw new Error(`all live gates are required; ${usage()}`);
  const result = await collector({ config: readJson(args.configPath), root: args.root, allowLiveProvider: true, provider: args.provider, model: args.model });
  if (!result || result.records !== 24 || result.status !== "trace-audited-diagnostic-candidate-not-an-effect-result" || !fs.existsSync(result.artifact_file)) throw new Error("validated trace-audited diagnostic candidate is unavailable");
  stdout.write(`${JSON.stringify({ status: result.status, records: result.records, artifact: result.artifact_file })}\n`);
}

module.exports = { TRACE_AUDIT_PREAMBLE, collectCleanReplay, inspectRawJsonl, invoke, nativeUsage, parseArgs, runCli, sealConfig };
if (require.main === module) runCli({ argv: process.argv.slice(2) }).catch(error => { process.stderr.write(`codex-clean-proof-replay-v10: ${error.message}\n`); process.exitCode = 1; });
