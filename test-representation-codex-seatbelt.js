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
