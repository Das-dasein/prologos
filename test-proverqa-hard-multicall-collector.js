"use strict";
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { PassThrough } = require("node:stream");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { collectMulticallSubscription } = require("./proverqa-hard-multicall-collector");

const baseCase = { source_answer: "A", p0: { context: "Ada is calm.", question: "Is Ada ready?" }, p1: { representation: "statement(1, atom(calm('Ada'))).", query_term: "query(atom(ready('Ada')))." }, private_formulas: ["calm(Ada)", "focused(Ada)", "∀x (calm(x) ∧ focused(x) → ready(x))"] };
const fixture = { schema_version: "proverqa-hard-hybrid-fixture-v1", cases: Array.from({ length: 12 }, (_, index) => ({ ...baseCase, case_id: `case-${index + 1}`, source_answer: ["A", "B", "C"][Math.floor(index / 4)] })) };
function fakeSpawn(seen) {
  return (command, args, options) => {
    seen.push({ command, args, options }); const child = new EventEmitter(); child.stdin = new PassThrough(); child.stdout = new PassThrough(); child.stderr = new PassThrough();
    process.nextTick(() => {
      const final = args[args.indexOf("--output-last-message") + 1], state = options.env.CODEX_HOME, brokers = fs.readdirSync(state).filter(name => name.startsWith("query-broker-")).sort().slice(0, 2).map(name => path.join(state, name));
      fs.writeFileSync(final, JSON.stringify({ answer: "RESULT: A" }));
      const events = brokers.flatMap((broker, index) => { const item = { id: `broker-${index}`, type: "command_execution", command: `/bin/zsh -lc ${broker}`, aggregated_output: "BROKER_RESULT: entailed\n" }; const suffix = path.basename(broker).replace(/^query-broker-|\.sh$/g, ""); fs.writeFileSync(path.join(options.cwd, `broker-receipt-${suffix}.txt`), "BROKER_RESULT: entailed\n"); return [{ type: "item.started", item }, { type: "item.completed", item }]; });
      events.push({ type: "turn.completed", usage: { input_tokens: 3, output_tokens: 1 } }); child.stdout.end(events.map(JSON.stringify).join("\n") + "\n"); child.stderr.end(""); child.emit("close", 0);
    }); return child;
  };
}
(async () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "proverqa-multicall-"));
  try {
    const fixtureFile = path.join(parent, "fixture.json"), authFile = path.join(parent, "auth.json"), rawRoot = path.join(parent, "raw"); fs.writeFileSync(fixtureFile, JSON.stringify(fixture)); fs.writeFileSync(authFile, "not-a-real-credential", { mode: 0o600 });
    const seen = [], result = await collectMulticallSubscription({ fixtureFile, rawRoot, model: "fake-codex", codexPath: "/bin/echo", authFile, swiplPath: "/usr/bin/false", spawnImpl: fakeSpawn(seen) });
    assert.equal(seen.length, 12); assert.equal(result.records.length, 12); assert.deepEqual(result.summary, { planned: 12, recorded: 12, protocol_valid: 12, protocol_invalid: 0, correct_among_valid: 4, accuracy_among_valid: 1 / 3, broker_calls_among_valid: { min: 2, max: 2, total: 24 } });
    assert.equal(result.records.every(record => record.condition === "P2_multicall" && record.broker_receipts.length === 2 && record.inspection.tool_events_observed === 2), true); assert.equal(JSON.stringify(result).includes("auth.json"), false); assert.equal(fs.readdirSync(rawRoot).filter(name => name.startsWith("codex-v10-sealed-")).every(name => !fs.existsSync(path.join(rawRoot, name, "state", "auth.json"))), true);
    const prompt = fs.readFileSync(path.join(rawRoot, fs.readdirSync(rawRoot).find(name => name.startsWith("codex-v10-sealed-")), "input", "sealed-prompt.txt"), "utf8"); assert.match(prompt, /from one to three/); assert.match(prompt, /each at most once/); assert.match(prompt, /not answers to the whole FOL question/);
    console.log("proverqa-hard-multicall-collector ok: separate P2 condition with 1..3 visible sealed broker calls");
  } finally { fs.rmSync(parent, { recursive: true, force: true }); }
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
