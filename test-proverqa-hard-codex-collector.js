"use strict";
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { PassThrough } = require("node:stream");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const seatbelt = require("./trusted-proof-codex-seatbelt-v10");
const { createBroker } = require("./proverqa-hard-hybrid-broker");
const { buildP2Broker, collectCodexSubscription } = require("./proverqa-hard-codex-collector");

const baseCase = { source_answer: "A", hybrid_quantifier_case: true, p0: { context: "Ada is calm.", question: "Is Ada ready?" }, p1: { representation: "statement(1, atom(calm('Ada'))).", query_term: "query(atom(ready('Ada')))." }, private_formulas: ["calm(Ada)", "focused(Ada)", "∀x (calm(x) ∧ focused(x) → ready(x))"] };
const fixture = { schema_version: "proverqa-hard-hybrid-fixture-v1", cases: Array.from({ length: 12 }, (_, index) => ({ ...baseCase, case_id: `case-${index + 1}`, source_answer: ["A", "B", "C"][Math.floor(index / 4)], hybrid_quantifier_case: index < 6 })) };
function fakeSpawn(seen) {
  return (command, args, options) => {
    seen.push({ command, args, options }); const child = new EventEmitter(); child.stdin = new PassThrough(); child.stdout = new PassThrough(); child.stderr = new PassThrough();
    process.nextTick(() => {
      const final = args[args.indexOf("--output-last-message") + 1], brokerFile = path.join(options.env.CODEX_HOME, "query-broker.sh"), p2 = fs.existsSync(brokerFile);
      fs.writeFileSync(final, JSON.stringify({ answer: "RESULT: A" }));
      if (p2) fs.writeFileSync(path.join(options.env.CODEX_HOME, "broker-receipt.txt"), "BROKER_RESULT: entailed\n");
      const item = { id: "one-broker", type: "command_execution", command: `/bin/zsh -lc ${brokerFile}` };
      child.stdout.end(p2 ? `${JSON.stringify({ type: "item.started", item })}\n${JSON.stringify({ type: "item.completed", item })}\n${JSON.stringify({ type: "turn.completed", usage: { input_tokens: 3, output_tokens: 1 } })}\n` : `${JSON.stringify({ type: "turn.completed", usage: { input_tokens: 3, output_tokens: 1 } })}\n`);
      child.stderr.end(""); child.emit("close", 0);
    });
    return child;
  };
}
(async () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "proverqa-codex-"));
  try {
    const directRun = seatbelt.createFreshSealedRunRoot(parent), swipl = "/opt/homebrew/bin/swipl";
    if (fs.existsSync(swipl)) {
      const p2 = buildP2Broker(directRun, fixture.cases[0], createBroker(fixture), swipl);
      const result = childProcess.spawnSync(p2.brokerFile, { encoding: "utf8" });
      assert.equal(result.status, 0); assert.equal(fs.readFileSync(p2.receiptFile, "utf8").trim(), "BROKER_RESULT: entailed");
      assert.match(fs.readFileSync(p2.brokerFile, "utf8"), /\$#.*-ne 0/);
      assert.match(fs.readFileSync(path.join(directRun.state_dir, "sealed-program.pl"), "utf8"), /set_prolog_flag\(unknown, fail\)/);
    }
    const fixtureFile = path.join(parent, "fixture.json"), authFile = path.join(parent, "auth.json"), rawRoot = path.join(parent, "raw");
    fs.writeFileSync(fixtureFile, JSON.stringify(fixture)); fs.writeFileSync(authFile, "not-a-real-credential", { mode: 0o600 });
    const seen = [], result = await collectCodexSubscription({ fixtureFile, rawRoot, model: "fake-codex", codexPath: "/bin/echo", authFile, swiplPath: "/usr/bin/false", spawnImpl: fakeSpawn(seen) });
    assert.equal(result.records.length, 36); assert.equal(seen.length, 36);
    const [p0, p1, p2] = result.records;
    assert.equal(p0.inspection.tool_events_observed, 0); assert.equal(p1.inspection.tool_events_observed, 0);
    assert.equal(p2.inspection.tool_events_observed, 1); assert.deepEqual(p2.broker_receipt, { status: "entailed", goal_id: "g3", goal: "ready('Ada')", selection: "rule-head" });
    assert.ok(p2.prompt.ref && p2.raw.stdout && p2.raw.stderr && p2.raw.final_output, "successful Codex run must retain raw trace artifacts");
    assert.equal(JSON.stringify(p2).includes("auth.json"), false, "credential paths must not enter collected evidence");
    assert.equal(fs.readdirSync(rawRoot).filter(name => name.startsWith("codex-v10-sealed-")).every(name => !fs.existsSync(path.join(rawRoot, name, "state", "auth.json"))), true, "temporary copied auth must not remain in raw evidence");
    const p2Prompt = fs.readdirSync(rawRoot).filter(name => name.startsWith("codex-v10-sealed-")).map(name => fs.readFileSync(path.join(rawRoot, name, "input", "sealed-prompt.txt"), "utf8")).find(prompt => prompt.includes("must execute exactly this private script path"));
    assert.match(p2Prompt, /must execute exactly this private script path/); assert.match(p2Prompt, /no arguments, shell prefix, quotes/); assert.match(p2Prompt, /Interpret quantifiers and every non-Horn construct yourself/);
    assert.match(fs.readFileSync(path.join(rawRoot, "transport.json"), "utf8"), /"api_key": false/);
    console.log("proverqa-hard-codex-collector ok: subscription-only P0/P1 isolation and forced one-call P2 broker");
  } finally { fs.rmSync(parent, { recursive: true, force: true }); }
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
