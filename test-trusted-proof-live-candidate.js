"use strict";
const assert = require("node:assert/strict"), childProcess = require("node:child_process"), fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const { collectCandidate, loadConfig } = require("./trusted-proof-live-candidate");
const configPath = path.join(__dirname, "trusted-proof-live-candidate-config-v5.json");
const dataset = require("./.cdr/waves/cognitive-proof-eval-v1/dataset.json");
function root() { const p = fs.mkdtempSync(path.join(os.tmpdir(), "pam-live-parent-")); return { p, r: path.join(p, "fresh-root") }; }
function fakeClient({ answerForRequest }) {
  let calls = 0;
  return {
    clientFactory: () => ({ responses: { create: async ({ model, input }) => {
      const answer = answerForRequest({ calls, model, input }); calls += 1;
      return { model, output_text: answer, usage: { input_tokens: 1024, output_tokens: 1, total_tokens: 1025 } };
    } } }),
    calls: () => calls,
  };
}
async function main() {
  const config = { ...loadConfig(configPath), model: "fake-model" };
  const universallyAcceptedAnswer = dataset.cases.map(fixture => `${fixture.hidden_answer_contract.allowed} ${JSON.stringify(fixture.expected_result)}`).join("\n");
  const accepted = fakeClient({ answerForRequest: ({ model, input }) => { assert.equal(model, "fake-model"); assert.equal(typeof input, "string"); return universallyAcceptedAnswer; } });
  const x = root(); try {
    const result = await collectCandidate({ config, root: x.r, provider: "openai-api", model: "fake-model", allowLiveProvider: true, clientFactory: accepted.clientFactory });
    assert.equal(result.records, 24); assert.equal(result.integrity.status, "candidate-integrity-valid-not-a-result-v5"); assert.equal(accepted.calls(), 24, "fake full collection has 12 deterministic P0/P1 pairs");
    const receipt = JSON.parse(fs.readFileSync(result.receipt_file, "utf8"));
    assert.equal(path.basename(result.receipt_file), "candidate-receipt-v5.json"); assert.equal(receipt.schema_version, "cognitive-proof-eval-receipt-intake-v5"); assert.equal(receipt.records.length, 24); assert.deepEqual(receipt.records.map(record => `${record.case_id}/${record.condition}`), [...dataset.cases].sort((a, b) => a.id.localeCompare(b.id)).flatMap(fixture => [`${fixture.id}/P0`, `${fixture.id}/P1`])); assert.deepEqual(receipt.wire_authority_prompt_digest_registry, { path: "wire-authority-assembled-prompt-digest-registry-v5.json", sha256: "ee6bbf345861dbc61b2e2fa897389d3ff53e1d97cdeb8c3b54682fedfafe4936" }); assert.equal(Object.hasOwn(receipt, "wire_prompt_digest_registry"), false);
    assert.equal(fs.existsSync(path.join(x.r, "candidate-receipt-v3.json")), false, "full fake collection emits receipt v5 only");
  } finally { fs.rmSync(x.p, { recursive: true, force: true }); }
  const callsBeforeFailures = accepted.calls();
  for (const [name, sampling] of [["seed", { temperature: 0, top_p: 1, seed: 0 }], ["missing", { temperature: 0 }], ["extra", { temperature: 0, top_p: 1, extra: 0 }], ["non-number", { temperature: "0", top_p: 1 }], ["temperature-range", { temperature: 3, top_p: 1 }], ["top-p-range", { temperature: 0, top_p: 2 }]]) {
    const invalid = root();
    try { await assert.rejects(() => collectCandidate({ config: { ...config, sampling }, root: invalid.r, provider: "openai-api", model: "fake-model", allowLiveProvider: true, clientFactory: accepted.clientFactory }), /sampling/); assert.equal(accepted.calls(), callsBeforeFailures, `${name}: no client`); assert.equal(fs.existsSync(invalid.r), false, `${name}: no root/receipt`); } finally { fs.rmSync(invalid.p, { recursive: true, force: true }); }
  }
  for (const bad of [() => collectCandidate({ config, root: root().r, provider: "openai-api", model: "fake-model", clientFactory: accepted.clientFactory }), () => collectCandidate({ config: { ...config, provider: "nope" }, root: root().r, provider: "openai-api", model: "fake-model", allowLiveProvider: true, clientFactory: accepted.clientFactory }), () => collectCandidate({ config, root: root().r, provider: "openai-api", model: "wrong", allowLiveProvider: true, clientFactory: accepted.clientFactory })]) await assert.rejects(bad); assert.equal(accepted.calls(), callsBeforeFailures);
  const y = root(); fs.mkdirSync(y.r); await assert.rejects(() => collectCandidate({ config, root: y.r, provider: "openai-api", model: "fake-model", allowLiveProvider: true, clientFactory: accepted.clientFactory }), /must not already exist/); fs.rmSync(y.p, { recursive: true, force: true });
  const z = root(); try { await assert.rejects(() => collectCandidate({ config: { ...config, source_commit: "a".repeat(40) }, root: z.r, provider: "openai-api", model: "fake-model", allowLiveProvider: true, clientFactory: accepted.clientFactory }), /CDR v5 registry/); assert.equal(fs.existsSync(z.r), false, "stale source creates no root or receipt"); } finally { fs.rmSync(z.p, { recursive: true, force: true }); }
  const rejected = fakeClient({ answerForRequest: () => "wrong answer" }); const failed = root(); try { await assert.rejects(() => collectCandidate({ config, root: failed.r, provider: "openai-api", model: "fake-model", allowLiveProvider: true, clientFactory: rejected.clientFactory }), /every local scorer decision must be accepted/); assert.equal(fs.existsSync(path.join(failed.r, "candidate-receipt-v5.json")), false, "rejected local decision leaves no receipt"); } finally { fs.rmSync(failed.p, { recursive: true, force: true }); }
  const cli = JSON.parse(childProcess.execFileSync(process.execPath, [path.join(__dirname, "trusted-proof-live-candidate.js")], { encoding: "utf8" })); assert.deepEqual(cli, { status: "offline-no-default-provider", provider_calls: 0 }, "default CLI is inert");
  console.log("trusted-proof-live-candidate ok");
}
main().catch(e => { console.error(e.stack || e); process.exitCode = 1; });
