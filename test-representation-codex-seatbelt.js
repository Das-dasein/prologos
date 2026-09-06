"use strict";

// This test is intentionally provider-free.  The fake child exercises the
// exact argv and raw-wire handling; the optional macOS branch exercises the
// real Seatbelt preflight and SWI denial without authenticating Codex.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { EventEmitter, PassThrough } = require("node:stream");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const api = require("./representation-live-evaluator");
const seatbelt = require("./trusted-proof-codex-seatbelt-v10");

const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const stable = value => JSON.stringify(value, null, 2) + "\n";

function fakeSpawn({ invalid = false, seen }) {
  return (command, args, options) => {
    seen.push({ command, args, options });
    const child = new EventEmitter(); child.stdin = new PassThrough(); child.stdout = new PassThrough(); child.stderr = new PassThrough();
    process.nextTick(() => {
      const final = args[args.indexOf("--output-last-message") + 1];
      fs.writeFileSync(final, JSON.stringify({ answer: "RESULT: entailed" }));
      child.stdout.end(invalid ? "not-json\n" : `${JSON.stringify({ type: "turn.completed", usage: { input_tokens: 11, output_tokens: 2 } })}\n`);
      child.stderr.end(""); child.emit("close", 0);
    });
    return child;
  };
}
function fakeP2Spawn({ seen, labels }) {
  let p2Index = 0;
  return (command, args, options) => {
    seen.push({ command, args, options });
    const child = new EventEmitter(); child.stdin = new PassThrough(); child.stdout = new PassThrough(); child.stderr = new PassThrough();
    process.nextTick(() => {
      const final = args[args.indexOf("--output-last-message") + 1];
      const state = options.env.CODEX_HOME;
      const broker = fs.readdirSync(state, { withFileTypes: true }).find(entry => entry.name === "query-broker.sh");
      const brokerPath = path.join(state, "query-broker.sh");
      const label = broker ? labels[p2Index++] : "entailed"; if (broker) fs.writeFileSync(path.join(state, "broker-receipt.txt"), `BROKER_RESULT: ${label}\n`);
      fs.writeFileSync(final, JSON.stringify({ answer: "RESULT: entailed" }));
      child.stdout.end(`${JSON.stringify({ type: "item.completed", item: { type: "command_execution", command: broker ? `/bin/zsh -lc ${brokerPath}` : "foreign" } })}\n${JSON.stringify({ type: "turn.completed", usage: { input_tokens: 11, output_tokens: 2 } })}\n`); child.stderr.end(""); child.emit("close", 0);
    });
    return child;
  };
}
async function main() {
  const fixturePath = path.join(__dirname, ".cdr/waves/representation-formalization-v1/representation-world-fixture-v1.json");
  const fixture = api.loadFixture(fixturePath);
  const config = { schema_version: api.CONFIG_SCHEMA_VERSION, provider: "codex-seatbelt", model: "fake-codex-model", sampling: { temperature: 0, top_p: 1 }, retry_policy: { max_attempts: 1, retryable: [] }, fixture_sha256: fixture.sha256 };
  const configInput = { file: path.join(os.tmpdir(), "fake-config.json"), config: api.validateConfig(config, fixture.sha256), bytes: stable(config), sha256: sha256(stable(config)) };
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "representation-codex-seatbelt-"));
  const auth = path.join(parent, "auth.json"); fs.writeFileSync(auth, "not-a-real-credential", { mode: 0o600 });
  try {
    const seen = [], preflights = [];
    const result = await api.collectLive({ fixtureInput: fixture, configInput, allowLiveProvider: true, provider: "codex-seatbelt", model: config.model, rawRoot: path.join(parent, "valid"), codexPath: "/bin/echo", authFile: auth, swiplPath: "/usr/bin/false", spawnImpl: fakeSpawn({ seen }), preflight: values => { preflights.push(values); return { status: "fake-preflight-no-provider-call" }; } });
    assert.equal(preflights.length, 1); assert.equal(seen.length, 48); assert.equal(result.aggregate.calls_recorded, 48);
    for (const call of seen) {
      assert.equal(call.command, seatbelt.SANDBOX, "outer Seatbelt must be the actual child command");
      assert.equal(call.args[0], "-p"); assert.match(call.args[1], /\(deny default\)/);
      assert.equal(call.args[2], "/bin/echo");
      for (const token of ["exec", "--json", "--ephemeral", "--ignore-user-config", "-C", "--output-schema", "--output-last-message"]) assert.ok(call.args.includes(token), `missing ${token}`);
      assert.equal(call.args.includes("workspace-write"), true);
    }
    for (const record of result.aggregate.records) {
      assert.equal(record.inspection.tool_events_observed, 0); assert.equal(record.provider, "codex-seatbelt");
      assert.ok(record.raw.stdout && record.raw.stderr && record.raw.final_output, "successful call retains all raw artifacts");
      assert.equal(record.raw_response.ref.includes("auth.json"), false, "credential is never an evidence artifact");
    }
    const p2Config = { ...config, provider: "codex-trace-gated-p2", model: "gpt-5.4-mini" }, p2Input = { file: path.join(os.tmpdir(), "fake-p2-config.json"), config: api.validateConfig(p2Config, fixture.sha256), bytes: stable(p2Config), sha256: sha256(stable(p2Config)) };
    const p2Seen = [], labels = api.counterbalancedPlan(fixture.fixture).filter(item => item.condition === "P0").map(item => item.case.oracle.label), p2 = await api.collectLive({ fixtureInput: fixture, configInput: p2Input, allowLiveProvider: true, provider: "codex-trace-gated-p2", model: p2Config.model, rawRoot: path.join(parent, "p2"), codexPath: "/bin/echo", authFile: auth, swiplPath: "/usr/bin/false", spawnImpl: fakeP2Spawn({ seen: p2Seen, labels }), preflight: () => ({ status: "fake-p2-preflight-no-provider-call" }) });
    assert.equal(p2Seen.length, 72); assert.equal(p2.aggregate.calls_recorded, 72); assert.deepEqual(Object.fromEntries(Object.entries(p2.aggregate.per_condition).map(([key, value]) => [key, value.denominator])), { P0: 24, P1: 24, P2: 24 });
    assert.equal(fs.readFileSync(path.join(parent, "p2", "trace-gate-mode.json"), "utf8"), stable({ mode: "trace-gated-native-codex-sandbox", outer_seatbelt: false, p0_p1: "reject any tool_or_command JSONL event", p2: "require exactly one no-argument private broker event" }));
    for (const call of p2Seen) {
      assert.equal(call.command, "/bin/echo", "trace-gated transport must invoke Codex directly, without an outer Seatbelt");
      assert.equal(call.args.includes(seatbelt.SANDBOX), false, "trace-gated transport must not wrap Codex in Seatbelt");
      assert.equal(call.args[call.args.indexOf("--model") + 1], "gpt-5.4-mini");
      assert.equal(call.args[call.args.indexOf("--sandbox") + 1], "workspace-write");
      assert.equal(call.args[call.args.indexOf("-C") + 1], call.options.cwd, "trace-gated Codex -C must bind to the fresh workspace");
      assert.equal(call.options.cwd.endsWith(`${path.sep}workspace`), true, "trace-gated Codex cwd must be the fresh workspace");
      assert.equal(call.args[call.args.indexOf("-C") + 1], call.options.cwd, "trace-gated Codex -C and cwd must be identical");
    }
    assert.equal(p2.aggregate.per_condition.P2.correctness_count, 12); assert.equal(p2.aggregate.per_condition.P2.format_failure_count, 0); assert.equal(p2.aggregate.records.filter(record => record.condition === "P2").every(record => record.inspection.tool_events_observed === 1), true);
    const p2Trace = path.join(parent, "p2-trace.jsonl"), brokerPath = "/sealed/query-broker.sh", done = JSON.stringify({ type: "turn.completed", usage: { input_tokens: 1, output_tokens: 1 } });
    for (const command of [`/bin/zsh -c ${brokerPath}`, `/bin/zsh -lc ${brokerPath}`]) {
      fs.writeFileSync(p2Trace, `${JSON.stringify({ type: "item.completed", item: { type: "command_execution", command } })}\n${done}\n`);
      assert.equal(api.parseP2CodexJsonl(p2Trace, [], brokerPath).inspection.tool_events_observed, 1);
    }
    fs.writeFileSync(p2Trace, `${JSON.stringify({ type: "item.completed", item: { type: "command_execution", command: "/bin/zsh", args: ["-c", brokerPath] } })}\n${done}\n`);
    assert.equal(api.parseP2CodexJsonl(p2Trace, [], brokerPath).inspection.tool_events_observed, 1);
    for (const command of [`/bin/zsh -c ${brokerPath}; echo injected`, `/bin/zsh -lc ${brokerPath} foreign`, `/bin/zsh -lc '${brokerPath}'`]) {
      fs.writeFileSync(p2Trace, `${JSON.stringify({ type: "item.completed", item: { type: "command_execution", command } })}\n${done}\n`);
      assert.throws(() => api.parseP2CodexJsonl(p2Trace, [], brokerPath), /foreign or parameterized/);
    }
    fs.writeFileSync(p2Trace, `${JSON.stringify({ type: "item.completed", item: { type: "command_execution", command: "/bin/zsh", args: ["-lc", brokerPath, "extra"] } })}\n${done}\n`);
    assert.throws(() => api.parseP2CodexJsonl(p2Trace, [], brokerPath), /foreign or parameterized/);
    fs.writeFileSync(p2Trace, `${JSON.stringify({ type: "item.completed", item: { type: "command_execution", command: "/bin/zsh", args: ["-lc", brokerPath], env: { INJECTED: "1" } } })}\n${done}\n`);
    assert.throws(() => api.parseP2CodexJsonl(p2Trace, [], brokerPath), /unexpected command fields/);
    fs.writeFileSync(p2Trace, `${JSON.stringify({ type: "item.completed", item: { type: "command_execution", command: `/bin/zsh -lc ${brokerPath}` } })}\n${JSON.stringify({ type: "item.completed", item: { type: "command_execution", command: `/bin/zsh -lc ${brokerPath}` } })}\n${done}\n`); assert.throws(() => api.parseP2CodexJsonl(p2Trace, [], brokerPath), /exactly one broker action/);
    fs.writeFileSync(p2Trace, `${JSON.stringify({ type: "item.completed", item: { type: "command_execution", command: "/sealed/foreign.sh" } })}\n${done}\n`); assert.throws(() => api.parseP2CodexJsonl(p2Trace, [], brokerPath), /foreign or parameterized/);
    const bad = await api.collectLive({ fixtureInput: fixture, configInput, allowLiveProvider: true, provider: "codex-seatbelt", model: config.model, rawRoot: path.join(parent, "invalid"), codexPath: "/bin/echo", authFile: auth, swiplPath: "/usr/bin/false", spawnImpl: fakeSpawn({ invalid: true, seen: [] }), preflight: () => ({ status: "fake-preflight-no-provider-call" }) });
    assert.equal(bad.aggregate.invalid_or_missing_records.length, 48, "malformed JSONL makes every call a non-result");
    for (const record of bad.aggregate.records) assert.match(record.transport_error, /JSONL trace is malformed/);
    const contaminated = path.join(parent, "contaminated.jsonl");
    fs.writeFileSync(contaminated, `${JSON.stringify({ type: "item.completed", item: { type: "command_execution" } })}\n${JSON.stringify({ type: "turn.completed", usage: { input_tokens: 1, output_tokens: 1 } })}\n`);
    assert.throws(() => api.parseCodexJsonl(contaminated, [fixturePath]), /tool or command events/);
    fs.writeFileSync(contaminated, `${JSON.stringify({ type: "agent_message", text: fixturePath })}\n${JSON.stringify({ type: "turn.completed", usage: { input_tokens: 1, output_tokens: 1 } })}\n`);
    assert.throws(() => api.parseCodexJsonl(contaminated, [fixturePath]), /prohibited host path/);
    await assert.rejects(() => api.collectLive({ fixtureInput: fixture, configInput, allowLiveProvider: true, provider: "codex-seatbelt", model: config.model, rawRoot: path.join(parent, "bad-auth"), codexPath: "/bin/echo", authFile: path.join(parent, "not-auth.txt"), swiplPath: "/usr/bin/false", preflight: () => { throw new Error("must not preflight"); } }), /auth_file/);
    assert.throws(() => api.parseCodexJsonl(path.join(parent, "missing.jsonl"), []), /ENOENT/);
    console.log("representation codex-seatbelt ok: fake outer Seatbelt argv, JSONL rejection, and sealed raw evidence without provider/auth use");
  } finally { fs.rmSync(parent, { recursive: true, force: true }); }

  if (process.platform === "darwin" && fs.existsSync(seatbelt.SANDBOX)) {
    const codex = process.env.CODEX_BIN || "/Users/artem/.local/bin/codex";
    const swipl = process.env.SWIPL_BIN || "/opt/homebrew/bin/swipl";
    if (fs.existsSync(codex) && fs.existsSync(swipl)) {
      const realParent = fs.mkdtempSync(path.join(os.tmpdir(), "representation-codex-seatbelt-real-"));
      try {
        const raw = path.join(realParent, "raw"); fs.mkdirSync(raw, { mode: 0o700 });
        const report = api.codexSeatbeltPreflight({ rawRoot: raw, codexPath: codex, swiplPath: swipl });
        assert.equal(report.status, "codex-seatbelt-preflight-passed-no-provider-call"); assert.notEqual(report.swipl_denial_status, 0);
        console.log("representation codex-seatbelt macOS preflight ok: real Codex startup and SWI denial, no provider call");
      } finally { fs.rmSync(realParent, { recursive: true, force: true }); }
    } else console.log("skip: real Codex/SWI paths unavailable for macOS no-provider preflight");
  }
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
