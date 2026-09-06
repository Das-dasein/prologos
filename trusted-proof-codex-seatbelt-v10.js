"use strict";

// This is deliberately a *preflight*, not another answering adapter.  v10 is
// not allowed to turn a host checkout into an answering workspace again.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const SANDBOX = "/usr/bin/sandbox-exec";
const SYSTEM_READ_ROOTS = Object.freeze(["/bin", "/usr/lib", "/System/Library", "/dev", "/private/var/db/timezone", "/private/var/select/sh"]);
// Codex probes this system policy path even when it is absent. Seatbelt must
// return ENOENT rather than EPERM, otherwise Codex treats the optional policy
// lookup as a configuration failure.
// `/etc` is a symlink on macOS, but Seatbelt matches the spelling presented
// to open(2). Codex's `exec` config loader uses `/etc/...`; grant both exact
// aliases, never their parent directory.
const CODEX_REQUIREMENTS_FILES = Object.freeze(["/etc/codex/requirements.toml", "/private/etc/codex/requirements.toml"]);
// These are fixed OS TLS configuration files, not user or evaluation data.
// Keep this list literal and narrow: a future required file must be added with
// a reproduced startup probe, never by granting /private or /etc wholesale.
const TLS_RUNTIME_FILES = Object.freeze(["/private/etc/ssl/openssl.cnf", "/private/etc/ssl/cert.pem"]);

function absoluteFile(value, label, { exists = true } = {}) {
  if (typeof value !== "string" || !path.isAbsolute(value)) throw Error(`${label} must be an absolute path`);
  if (exists && (!fs.existsSync(value) || !fs.statSync(value).isFile())) throw Error(`${label} must name an existing file`);
  return exists ? fs.realpathSync(value) : path.resolve(value);
}
function absoluteDirectory(value, label, { exists = true } = {}) {
  if (typeof value !== "string" || !path.isAbsolute(value)) throw Error(`${label} must be an absolute path`);
  if (exists && (!fs.existsSync(value) || !fs.statSync(value).isDirectory())) throw Error(`${label} must name an existing directory`);
  return exists ? fs.realpathSync(value) : path.resolve(value);
}
function sameOrWithin(parent, child) { return child === parent || child.startsWith(`${parent}${path.sep}`); }
function quote(value) { return `(literal ${JSON.stringify(value)})`; }
function subpath(value) { return `(subpath ${JSON.stringify(value)})`; }
function ancestors(value) {
  const out = [];
  for (let current = value;; current = path.dirname(current)) { out.push(quote(current)); if (path.dirname(current) === current) return out; }
}
function rejectBroadRoot(value, label) {
  if (["/", "/Users", "/private", "/tmp", os.homedir()].includes(value)) throw Error(`${label} is too broad for the isolation profile`);
}
function protectedEvidenceRoots() {
  return Object.freeze([
    path.resolve(__dirname),
    path.resolve(__dirname, ".cdr", "waves", "cognitive-proof-eval-v1"),
    path.resolve(os.homedir(), ".codex", "memories")
  ]);
}
function rejectProtectedRoot(value, label) {
  for (const protectedRoot of protectedEvidenceRoots()) if (sameOrWithin(protectedRoot, value) || sameOrWithin(value, protectedRoot)) throw Error(`${label} overlaps a prohibited repository or evidence root`);
}
function declaredRuntimeRoots({ codexPath }) {
  const codex = absoluteFile(codexPath, "codex_path");
  // Runtime roots are closed over implementation-discovered values. In
  // particular, a caller cannot add another readable root to this profile.
  const roots = [...SYSTEM_READ_ROOTS, path.dirname(codex)];
  for (const root of roots) { rejectBroadRoot(root, "runtime root"); rejectProtectedRoot(root, "runtime root"); }
  return Object.freeze([...new Set(roots)]);
}
function createSeatbeltProfile({ runRoot, inputDir, outputDir, stateDir, codexPath, authFile = null }) {
  if (process.platform !== "darwin" || !fs.existsSync(SANDBOX)) throw Error("macOS sandbox-exec is required for v10 isolation preflight");
  const root = absoluteDirectory(runRoot, "run_root"), input = absoluteDirectory(inputDir, "sealed input directory"), output = absoluteDirectory(outputDir, "output directory"), state = absoluteDirectory(stateDir, "private state directory");
  if (![input, output, state].every(value => sameOrWithin(root, value)) || new Set([input, output, state]).size !== 3) throw Error("sealed input, output, and private state must be distinct children of run_root");
  const codex = absoluteFile(codexPath, "codex_path");
  const auth = authFile === null ? null : absoluteFile(authFile, "auth_file");
  const runtimeRoots = declaredRuntimeRoots({ codexPath: codex });
  const tlsFiles = TLS_RUNTIME_FILES.filter(fs.existsSync).map(file => fs.realpathSync(file));
  // Metadata grants are only path traversal.  Content reads are restricted to
  // runtime, the sealed input, and (when unavoidable) one exact auth file.
  const metadata = [...new Set([...runtimeRoots.flatMap(ancestors), ...CODEX_REQUIREMENTS_FILES.flatMap(ancestors), ...tlsFiles.flatMap(ancestors), ...ancestors(root), ...(auth ? ancestors(auth) : [])])].join(" ");
  // Seatbelt needs the root vnode readable to start a process. `(literal "/")`
  // is not a recursive grant; every child still requires one of the explicit
  // `subpath`/`literal` rules below.
  const reads = [quote("/"), runtimeRoots.map(subpath).join(" "), CODEX_REQUIREMENTS_FILES.map(quote).join(" "), tlsFiles.map(quote).join(" "), subpath(input), subpath(output), subpath(state), auth ? quote(auth) : ""].filter(Boolean).join(" ");
  return [
    "(version 1)", "(deny default)", "(allow process*)", "(allow file-map-executable)", "(allow sysctl-read)", "(allow mach-lookup)",
    "(allow network-outbound)", `(allow file-read-metadata ${metadata})`, `(allow file-read* ${reads})`, `(allow file-write* ${subpath(output)} ${subpath(state)})`
  ].join(" ");
}
function createFreshSealedRunRoot(parent) {
  const base = absoluteDirectory(parent, "run parent");
  const root = fs.realpathSync(fs.mkdtempSync(path.join(base, "codex-v10-sealed-")));
  const input = path.join(root, "input"), output = path.join(root, "output"), state = path.join(root, "state");
  fs.mkdirSync(input, { mode: 0o700 }); fs.mkdirSync(output, { mode: 0o700 }); fs.mkdirSync(state, { mode: 0o700 });
  return Object.freeze({ run_root: root, input_dir: input, output_dir: output, state_dir: state });
}
function writeSealedInput(run, { prompt, schema }) {
  if (!run || typeof prompt !== "string" || !prompt.trim() || typeof schema !== "string" || !schema.trim()) throw Error("sealed prompt and output schema are required");
  const promptFile = path.join(run.input_dir, "sealed-prompt.txt"), schemaFile = path.join(run.input_dir, "final-output.schema.json");
  fs.writeFileSync(promptFile, prompt, { flag: "wx", mode: 0o400 }); fs.writeFileSync(schemaFile, schema, { flag: "wx", mode: 0o400 });
  fs.chmodSync(promptFile, 0o400); fs.chmodSync(schemaFile, 0o400);
  return Object.freeze({ prompt_file: promptFile, schema_file: schemaFile });
}
function provisionPrivateCodexState(run, authFile) {
  if (!run || typeof run.state_dir !== "string") throw Error("run private state directory is required");
  const state = absoluteDirectory(run.state_dir, "private state directory");
  const auth = absoluteFile(authFile, "auth_file");
  if (path.basename(auth) !== "auth.json") throw Error("auth_file must be the exact CODEX_HOME/auth.json file");
  const destination = path.join(state, "auth.json");
  fs.copyFileSync(auth, destination, fs.constants.COPYFILE_EXCL);
  fs.chmodSync(destination, 0o600);
  return destination;
}
function buildCodexInvocation({ run, sealed, codexPath, model, authFile }) {
  if (!run || !sealed || typeof model !== "string" || !model.trim()) throw Error("run, sealed input and model are required");
  const codex = absoluteFile(codexPath, "codex_path");
  // Codex documents that --ignore-user-config still obtains auth from
  // CODEX_HOME. There is no auth-free live mode, so require one exact existing
  // auth.json rather than silently opening the user's whole .codex directory.
  const privateAuth = provisionPrivateCodexState(run, authFile);
  const profile = createSeatbeltProfile({ runRoot: run.run_root, inputDir: run.input_dir, outputDir: run.output_dir, stateDir: run.state_dir, codexPath: codex });
  const finalOutput = path.join(run.output_dir, "final-output.txt"), stdout = path.join(run.output_dir, "codex-stdout.jsonl"), stderr = path.join(run.output_dir, "codex-stderr.txt");
  // `-C` has to be the fresh root: never the repository. `--ignore-user-config`
  // deliberately retains only Codex authentication (via CODEX_HOME), not host
  // configuration or project instructions. This function never executes it.
  const args = ["-p", profile, codex, "exec", "--json", "--ephemeral", "-C", run.run_root, "--skip-git-repo-check", "--ignore-user-config", "--sandbox", "read-only", "--model", model, "--output-schema", sealed.schema_file, "--output-last-message", finalOutput, "-"];
  return Object.freeze({ command: SANDBOX, args: Object.freeze(args), cwd: run.run_root, env: Object.freeze({ CODEX_HOME: run.state_dir }), stdin_file: sealed.prompt_file, stdout_file: stdout, stderr_file: stderr, final_output_file: finalOutput, private_auth_file: privateAuth, profile, run_root: run.run_root });
}
function runSeatbeltProbe({ profile, cwd, command, args = [] }) {
  const result = spawnSync(SANDBOX, ["-p", profile, command, ...args], { cwd, encoding: "utf8" });
  return Object.freeze({ status: result.status, signal: result.signal, stdout: result.stdout || "", stderr: result.stderr || "", error: result.error ? result.error.message : null });
}
function offlineProbeReport({ run, codexPath, repositoryFile, memoryFile, datasetOrEvaluatorFile, outsideWriteFile }) {
  for (const [value, label] of [[repositoryFile, "repository file"], [memoryFile, "MEMORY file"], [datasetOrEvaluatorFile, "dataset/evaluator file"]]) absoluteFile(value, label);
  if (typeof outsideWriteFile !== "string" || !path.isAbsolute(outsideWriteFile) || sameOrWithin(run.run_root, path.resolve(outsideWriteFile))) throw Error("outside write target must be outside run_root");
  const sealed = writeSealedInput(run, { prompt: "sealed input", schema: "{\"type\":\"object\"}\n" });
  const profile = createSeatbeltProfile({ runRoot: run.run_root, inputDir: run.input_dir, outputDir: run.output_dir, stateDir: run.state_dir, codexPath });
  const runtimeStart = runSeatbeltProbe({ profile, cwd: run.run_root, command: absoluteFile(codexPath, "codex_path"), args: ["--version"] });
  const tlsReads = TLS_RUNTIME_FILES.filter(fs.existsSync).map(file => runSeatbeltProbe({ profile, cwd: run.run_root, command: "/bin/cat", args: [fs.realpathSync(file)] }));
  const deniedRead = file => runSeatbeltProbe({ profile, cwd: run.run_root, command: "/bin/cat", args: [file] });
  const allowedInput = runSeatbeltProbe({ profile, cwd: run.run_root, command: "/bin/cat", args: [sealed.prompt_file] });
  const outputTarget = path.join(run.output_dir, "probe-output.txt"), stateTarget = path.join(run.state_dir, "probe-state.txt");
  const allowedWrite = runSeatbeltProbe({ profile, cwd: run.run_root, command: "/bin/sh", args: ["-c", `printf permitted > ${JSON.stringify(outputTarget)}`] });
  const allowedStateWrite = runSeatbeltProbe({ profile, cwd: run.run_root, command: "/bin/sh", args: ["-c", `printf permitted > ${JSON.stringify(stateTarget)}`] });
  const deniedWrite = runSeatbeltProbe({ profile, cwd: run.run_root, command: "/bin/sh", args: ["-c", `printf forbidden > ${JSON.stringify(outsideWriteFile)}`] });
  const checks = Object.freeze({ runtime_start: runtimeStart, tls_runtime_read: tlsReads, repository_read: deniedRead(repositoryFile), memory_read: deniedRead(memoryFile), dataset_or_evaluator_read: deniedRead(datasetOrEvaluatorFile), outside_write: deniedWrite, sealed_input_read: allowedInput, declared_output_write: allowedWrite, private_state_write: allowedStateWrite });
  const denied = check => check.status !== 0;
  if (![checks.repository_read, checks.memory_read, checks.dataset_or_evaluator_read, checks.outside_write].every(denied)) throw Error("Seatbelt preflight did not deny every protected host access");
  if (checks.runtime_start.status !== 0 || checks.tls_runtime_read.some(check => check.status !== 0) || checks.sealed_input_read.status !== 0 || checks.declared_output_write.status !== 0 || checks.private_state_write.status !== 0 || !fs.existsSync(outputTarget) || !fs.existsSync(stateTarget)) throw Error("Seatbelt preflight did not permit declared isolated runtime/input/output/state");
  return Object.freeze({ status: "seatbelt-preflight-passed-no-provider-call-v10", checks });
}

module.exports = { SANDBOX, createFreshSealedRunRoot, writeSealedInput, provisionPrivateCodexState, createSeatbeltProfile, buildCodexInvocation, runSeatbeltProbe, offlineProbeReport };
