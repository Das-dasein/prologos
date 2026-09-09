"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const runner = require("./run-near-signature-constructed");
const audit = require("./near-signature-reflection-run");

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "nsr-constructed-"));
const fake = path.join(temp, "fake-codex.js");
const count = path.join(temp, "calls.log");
const wave = ".cdr/waves/near-signature-constructed-v1";
const protocolFile = path.join(wave, "protocol-v1.json");
const protocolHashFile = path.join(wave, "protocol-v1.sha256");
const originalProtocol = fs.readFileSync(protocolFile, "utf8");
const originalProtocolHash = fs.readFileSync(protocolHashFile, "utf8");
const marker = "\n\nAdvisory near_signature_audit (read-only; it did not change the candidate):\n";
const sha256 = value => require("node:crypto").createHash("sha256").update(value).digest("hex");

fs.writeFileSync(fake, `#!/usr/bin/env node
const fs=require('fs');
const args=process.argv, output=args[args.indexOf('--output-last-message')+1];
fs.appendFileSync(process.env.NSR_FAKE_COUNT,'1\\n');
fs.writeFileSync(output,JSON.stringify({problems:[],boundary:'ok'}));
for(const event of [{type:'thread.started'},{type:'turn.started'},{type:'item.completed',item:{type:'agent_message',text:fs.readFileSync(output,'utf8')}},{type:'turn.completed'}]) console.log(JSON.stringify(event));
`);
fs.chmodSync(fake, 0o755);

function receiptFiles(directory) {
  const found = [];
  const walk = current => fs.readdirSync(current, { withFileTypes: true }).forEach(entry => {
    const file = path.join(current, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (entry.name === "receipt.json") found.push(file);
  });
  walk(directory);
  return found.sort();
}

(async () => {
  const protocol = JSON.parse(originalProtocol);
  protocol.codex_path = fake;
  const testProtocol = JSON.stringify(protocol, null, 2) + "\n";
  fs.writeFileSync(protocolFile, testProtocol);
  fs.writeFileSync(protocolHashFile, sha256(testProtocol) + "\n");
  process.env.NSR_FAKE_COUNT = count;
  try {
    const raw = path.join(temp, "raw");
    await runner.run(raw);
    const fixture = runner.frozenInputs().fixture;
    const receipts = receiptFiles(raw);
    assert.equal(receipts.length, 32);
    assert.equal(fs.existsSync(path.join(raw, "m0")), false);
    assert.equal(fs.existsSync(path.join(raw, "real-1", "m0")), false);
    assert.equal(fs.readFileSync(count, "utf8").trim().split("\n").length, 32);
    const provenance = JSON.parse(fs.readFileSync(path.join(raw, "provenance.json"), "utf8"));
    assert.equal(provenance.gold_read_for_hash_only, true);
    assert.equal(provenance.calls_planned, 32);
    assert.equal(provenance.m0_calls, 0);
    for (const item of fixture.cases) {
      const record = JSON.parse(fs.readFileSync(path.join(raw, item.case_id, "record.json"), "utf8"));
      const expected = protocol.order[item.case_id] === "baseline_first" ? ["m1", "m2"] : ["m2", "m1"];
      assert.deepEqual(record.calls.map(call => call.label), expected);
      for (const call of record.calls) {
        const request = JSON.parse(fs.readFileSync(path.join(raw, item.case_id, call.label, "request.json"), "utf8"));
        const receipt = JSON.parse(fs.readFileSync(path.join(raw, item.case_id, call.label, "receipt.json"), "utf8"));
        assert.deepEqual(request.schema, audit.REVIEW_SCHEMA);
        assert.equal(receipt.error, null);
        if (call.label === "m1") assert.equal(request.prompt.includes(marker), false);
        else {
          const at = request.prompt.indexOf(marker);
          assert.ok(at >= 0);
          assert.equal(request.prompt.slice(at + marker.length), record.certificates.near);
        }
      }
      const m1 = JSON.parse(fs.readFileSync(path.join(raw, item.case_id, "m1", "request.json"), "utf8")).prompt;
      const m2 = JSON.parse(fs.readFileSync(path.join(raw, item.case_id, "m2", "request.json"), "utf8")).prompt;
      assert.equal(m2.slice(0, m2.indexOf(marker)), m1);
    }
    const broken = { ...protocol, fixture_sha256: "deliberately-wrong" };
    fs.writeFileSync(protocolFile, JSON.stringify(broken, null, 2) + "\n");
    const blockedRoot = path.join(temp, "must-not-exist");
    await assert.rejects(runner.run(blockedRoot), /frozen_hash_gate_failed/);
    assert.equal(fs.existsSync(blockedRoot), false);
    assert.equal(fs.readFileSync(count, "utf8").trim().split("\n").length, 32);
    console.log("constructed runner gates verified");
  } finally {
    fs.writeFileSync(protocolFile, originalProtocol);
    fs.writeFileSync(protocolHashFile, originalProtocolHash);
    fs.rmSync(temp, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
