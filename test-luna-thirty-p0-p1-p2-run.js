"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const runner = require("./run-luna-thirty-p0-p1-p2");

const sourceWave = path.join(__dirname, ".cdr/waves/luna-thirty-p0-p1-p2-v1");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "p0-p1-p2-run-"));
const wave = path.join(temp, "wave");
const count = path.join(temp, "calls.log");
const fake = path.join(temp, "fake-codex.js");
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");

function write(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, value); }
function countCalls() { return fs.existsSync(count) ? fs.readFileSync(count, "utf8").trim().split("\n").filter(Boolean).length : 0; }
function makeWave({ badTrace = false } = {}) {
  const fixture = JSON.parse(fs.readFileSync(path.join(sourceWave, "fixture-draft.json"), "utf8"));
  fixture.status = "frozen-before-model-output";
  const fixtureText = `${JSON.stringify(fixture, null, 2)}\n`;
  const contractText = fs.readFileSync(path.join(sourceWave, "answer-contract-draft.md"), "utf8");
  const protocol = JSON.parse(fs.readFileSync(path.join(sourceWave, "protocol-draft.json"), "utf8"));
  protocol.status = "frozen-before-model-output";
  protocol.fixture_sha256 = sha256(fixtureText);
  protocol.answer_contract_sha256 = sha256(contractText);
  protocol.codex_path = fake;
  write(path.join(wave, "fixture-draft.json"), fixtureText);
  write(path.join(wave, "answer-contract-draft.md"), contractText);
  write(path.join(wave, "protocol-draft.json"), `${JSON.stringify(protocol, null, 2)}\n`);
  write(path.join(wave, "bad-trace"), badTrace ? "yes" : "no");
  return { fixture, protocol };
}
function receiptFiles(root) {
  const files = [];
  const walk = current => fs.readdirSync(current, { withFileTypes: true }).forEach(entry => {
    const file = path.join(current, entry.name);
    if (entry.isDirectory()) walk(file); else if (entry.name === "receipt.json") files.push(file);
  });
  walk(root); return files;
}

write(fake, `#!/usr/bin/env node
const fs=require('fs');
const a=process.argv, output=a[a.indexOf('--output-last-message')+1], cwd=process.cwd();
fs.appendFileSync(process.env.P0P1P2_FAKE_COUNT,'1\\n');
fs.writeFileSync(output,JSON.stringify(process.env.P0P1P2_BAD_SCHEMA==='yes'?{answer:'A'}:{answer:'A',reason:'fake answer'}));
console.log(JSON.stringify({type:'thread.started'}));
console.log(JSON.stringify({type:'turn.started'}));
if(fs.existsSync(process.env.P0P1P2_BAD_TRACE)&&fs.readFileSync(process.env.P0P1P2_BAD_TRACE,'utf8').trim()==='yes') console.log(JSON.stringify({type:'item.completed',item:{type:'tool_call'}}));
else console.log(JSON.stringify({type:'item.completed',item:{type:'agent_message',text:fs.readFileSync(output,'utf8')}}));
console.log(JSON.stringify({type:'turn.completed'}));
`);
fs.chmodSync(fake, 0o755);
process.env.P0P1P2_FAKE_COUNT = count;

try {
  const { fixture, protocol } = makeWave();
  process.env.P0P1P2_BAD_TRACE = path.join(wave, "bad-trace");
  const raw = path.join(temp, "raw");
  runner.run(raw, wave);
  assert.equal(countCalls(), 18);
  assert.equal(receiptFiles(raw).length, 18);
  assert.equal(fs.existsSync(path.join(raw, "completed.json")), true);
  const provenance = JSON.parse(fs.readFileSync(path.join(raw, "provenance.json"), "utf8"));
  assert.equal(provenance.gold_read, false);
  assert.equal(provenance.calls_planned, 18);
  for (const item of fixture.fixture) {
    const record = JSON.parse(fs.readFileSync(path.join(raw, item.case_id, "record.json"), "utf8"));
    assert.deepEqual(record.calls.map(call => call.condition), protocol.condition_order[item.case_id]);
    const request = condition => JSON.parse(fs.readFileSync(path.join(raw, item.case_id, condition, "request.json"), "utf8"));
    const P0 = request("P0"), P1 = request("P1"), P2 = request("P2");
    assert.deepEqual(P0.schema, runner.ANSWER_SCHEMA);
    assert.deepEqual(P1.schema, runner.ANSWER_SCHEMA);
    assert.deepEqual(P2.schema, runner.ANSWER_SCHEMA);
    assert.equal(P1.prompt, `${P0.prompt}${runner.p1Suffix(item)}`);
    assert.equal(P2.prompt, `${P1.prompt}${runner.p2Suffix(item)}`);
    assert.equal(P0.prompt.includes(item.candidate.program), false);
    assert.equal(P1.prompt.includes(item.execution_evidence), false);
    assert.equal(P2.prompt.includes(item.execution_evidence), true);
    assert.equal(P2.prompt.includes("Warning:"), false);
    assert.equal(P2.prompt.includes("/private/"), false);
    for (const condition of ["P0", "P1", "P2"]) assert.equal(JSON.parse(fs.readFileSync(path.join(raw, item.case_id, condition, "receipt.json"), "utf8")).error, null);
  }
  assert.throws(() => runner.run(raw, wave), /raw_root_must_not_exist_no_resume/);
  assert.equal(countCalls(), 18);

  const brokenWave = path.join(temp, "broken-wave");
  fs.cpSync(wave, brokenWave, { recursive: true });
  const brokenProtocol = path.join(brokenWave, "protocol-draft.json");
  const broken = JSON.parse(fs.readFileSync(brokenProtocol, "utf8"));
  broken.fixture_sha256 = "bad";
  fs.writeFileSync(brokenProtocol, `${JSON.stringify(broken, null, 2)}\n`);
  const blocked = path.join(temp, "blocked");
  assert.throws(() => runner.run(blocked, brokenWave), /frozen_hash_gate_failed/);
  assert.equal(fs.existsSync(blocked), false);
  assert.equal(countCalls(), 18);

  const failingWave = path.join(temp, "failing-wave");
  fs.cpSync(wave, failingWave, { recursive: true });
  process.env.P0P1P2_BAD_TRACE = path.join(failingWave, "bad-trace");
  fs.writeFileSync(process.env.P0P1P2_BAD_TRACE, "yes");
  const failing = path.join(temp, "failing");
  assert.throws(() => runner.run(failing, failingWave), /receipt_gate_failed:case-128:P0:trace_gate_failed/);
  assert.equal(receiptFiles(failing).length, 1);
  assert.equal(JSON.parse(fs.readFileSync(path.join(failing, "stopped.json"), "utf8")).completed_calls, 1);
  assert.equal(countCalls(), 19);

  const schemaWave = path.join(temp, "schema-wave");
  fs.cpSync(wave, schemaWave, { recursive: true });
  process.env.P0P1P2_BAD_TRACE = path.join(schemaWave, "bad-trace");
  fs.writeFileSync(process.env.P0P1P2_BAD_TRACE, "no");
  process.env.P0P1P2_BAD_SCHEMA = "yes";
  const schemaFailure = path.join(temp, "schema-failure");
  assert.throws(() => runner.run(schemaFailure, schemaWave), /receipt_gate_failed:case-128:P0:output_schema_failed/);
  assert.equal(receiptFiles(schemaFailure).length, 1);
  assert.equal(JSON.parse(fs.readFileSync(path.join(schemaFailure, "stopped.json"), "utf8")).error, "output_schema_failed");
  assert.equal(countCalls(), 20);
  delete process.env.P0P1P2_BAD_SCHEMA;
  console.log("p0/p1/p2 runner gates verified");
} finally {
  delete process.env.P0P1P2_FAKE_COUNT;
  delete process.env.P0P1P2_BAD_TRACE;
  delete process.env.P0P1P2_BAD_SCHEMA;
  fs.rmSync(temp, { recursive: true, force: true });
}
