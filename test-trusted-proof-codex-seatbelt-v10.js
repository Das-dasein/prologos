"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const api = require("./trusted-proof-codex-seatbelt-v10");

if (process.platform !== "darwin" || !fs.existsSync(api.SANDBOX)) { console.log("skip: v10 Seatbelt probes require macOS sandbox-exec"); process.exit(0); }
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "codex-v10-seatbelt-test-"));
const parent = path.join(fixture, "runs"), host = path.join(fixture, "host"); fs.mkdirSync(parent); fs.mkdirSync(host);
const make = (name, value) => { const file = path.join(host, name); fs.writeFileSync(file, value, { mode: 0o600 }); return file; };
try {
  const repositoryFile = path.join(__dirname, "package.json");
  const preferredMemory = path.join(os.homedir(), ".codex", "memories", "MEMORY.md");
  const memoryFile = fs.existsSync(preferredMemory) ? preferredMemory : make("MEMORY.md", "memory-contract");
  const datasetFile = path.join(__dirname, ".cdr", "waves", "cognitive-proof-eval-v1", "dataset.json"), outside = path.join(host, "must-not-write.txt");
  const run = api.createFreshSealedRunRoot(parent);
  const report = api.offlineProbeReport({ run, codexPath: "/bin/echo", repositoryFile, memoryFile, datasetOrEvaluatorFile: datasetFile, outsideWriteFile: outside });
  assert.equal(report.status, "seatbelt-preflight-passed-no-provider-call-v10");
  for (const key of ["repository_read", "memory_read", "dataset_or_evaluator_read", "outside_write"]) assert.notEqual(report.checks[key].status, 0, `${key} must be denied`);
  assert.equal(report.checks.runtime_start.status, 0, "offline runtime startup must be permitted");
  assert.ok(report.checks.tls_runtime_read.every(check => check.status === 0), "declared TLS runtime files must be permitted");
  assert.equal(report.checks.sealed_input_read.status, 0); assert.equal(report.checks.declared_output_write.status, 0);
  assert.equal(fs.existsSync(outside), false); assert.equal(fs.readFileSync(path.join(run.output_dir, "probe-output.txt"), "utf8"), "permitted");
  // Mutation: the old API could add __dirname as a runtime root. The v10
  // profile has no caller-provided runtime-root grant, so even a supplied
  // ignored legacy field cannot make the repository readable; pointing the
  // declared executable into the checkout fails closed as well.
  const legacyExtra = api.createSeatbeltProfile({ runRoot: run.run_root, inputDir: run.input_dir, outputDir: run.output_dir, codexPath: "/bin/echo", extraRuntimeRoots: [__dirname] });
  assert.notEqual(api.runSeatbeltProbe({ profile: legacyExtra, cwd: run.run_root, command: "/bin/cat", args: [repositoryFile] }).status, 0, "legacy runtime-root injection must not grant repo read");
  assert.throws(() => api.createSeatbeltProfile({ runRoot: run.run_root, inputDir: run.input_dir, outputDir: run.output_dir, codexPath: repositoryFile }), /prohibited repository or evidence root/);
  const invocationRun = api.createFreshSealedRunRoot(parent), sealed = api.writeSealedInput(invocationRun, { prompt: "p", schema: "{}" });
  const authFile = make("auth.json", "not-a-real-credential");
  const invocation = api.buildCodexInvocation({ run: invocationRun, sealed, codexPath: "/bin/echo", model: "test-model", authFile });
  assert.equal(invocation.command, "/usr/bin/sandbox-exec");
  for (const token of ["-C", "--skip-git-repo-check", "--ignore-user-config", "--sandbox", "read-only", "--ephemeral"]) assert.ok(invocation.args.includes(token), `missing ${token}`);
  assert.equal(invocation.args[invocation.args.indexOf("-C") + 1], invocation.run_root); assert.equal(invocation.env.CODEX_HOME, fs.realpathSync(host));
  assert.equal(invocation.args.includes(process.cwd()), false);
  assert.match(invocation.profile, /\(allow network-outbound\)/);
  assert.throws(() => api.buildCodexInvocation({ run: invocationRun, sealed, codexPath: "/bin/echo", model: "x", authFile: path.join(host, "missing-auth") }), /auth_file/);
  console.log("ok: Codex v10 Seatbelt preflight denies host reads/writes and emits no provider call");
} finally { fs.rmSync(fixture, { recursive: true, force: true }); }
