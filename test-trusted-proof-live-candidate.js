"use strict";

const assert = require("node:assert/strict"), fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const { collectCandidate, loadConfig } = require("./trusted-proof-live-candidate");
const { immutableInputs } = require("./trusted-proof-preflight");
const configPath = path.join(__dirname, "trusted-proof-live-candidate-config-v6.json");
function root() { const p = fs.mkdtempSync(path.join(os.tmpdir(), "pam-live-parent-")); return { p, r: path.join(p, "fresh-root") }; }
function fakeClient({ answerForRequest, usageForRequest = () => ({ input_tokens: 1024, output_tokens: 1, total_tokens: 1025 }) }) {
  let calls = 0;
  return {
    clientFactory: () => ({ responses: { create: async ({ model, input }) => {
      const index = calls++; return { model, output_text: answerForRequest({ calls: index, model, input }), usage: usageForRequest(index) };
    } } }),
    calls: () => calls,
  };
}
function acceptedAnswer(calls, cases) {
  const fixture = cases[Math.floor(calls / 2)];
  return fixture.hidden_answer_contract.allowed + (calls % 2 ? `\n${JSON.stringify(fixture.expected_result)}` : "");
}
async function main() {
  const config = { ...loadConfig(configPath), model: "fake-model" };
  const cases = [...immutableInputs().dataset.cases].sort((a, b) => a.id.localeCompare(b.id));
  const accepted = fakeClient({ answerForRequest: ({ calls, model, input }) => { assert.equal(model, "fake-model"); assert.equal(typeof input, "string"); return acceptedAnswer(calls, cases); } });
  const x = root(); try {
    const out = await collectCandidate({ config, root: x.r, provider: "openai-api", model: "fake-model", allowLiveProvider: true, clientFactory: accepted.clientFactory });
    assert.equal(accepted.calls(), 24); assert.equal(out.records, 24); assert.equal(out.integrity.status, "candidate-integrity-valid-not-a-result-v6");
    const receipt = JSON.parse(fs.readFileSync(out.receipt_file));
    assert.equal(path.basename(out.receipt_file), "candidate-receipt-v6.json"); assert.equal(receipt.schema_version, "cognitive-proof-eval-receipt-intake-v6"); assert.equal(receipt.records.length, 24);
    assert.ok(receipt.records.every(record => record.scorer.decision === "accepted"));
    assert.ok(receipt.records.every(record => record.usage.measured_effective_context_budget === record.usage.provider_usage.input_tokens && record.usage.provider_usage.total_tokens === record.usage.provider_usage.input_tokens + record.usage.provider_usage.output_tokens), "v6 receipt preserves reconciled native usage and E=input");
    assert.deepEqual(receipt.records.filter((_, i) => i % 2 === 0).map(r => r.condition), Array(12).fill("P0"));
    assert.equal(new Set(receipt.records.flatMap(r => [r.prompt.ref, r.raw.ref])).size, 48);
  } finally { fs.rmSync(x.p, { recursive: true, force: true }); }
  for (const [name, answerForRequest] of [["all rejected", () => "fake"], ["mixed rejected", ({ calls }) => calls === 7 ? "fake" : acceptedAnswer(calls, cases)]]) {
    const rejected = fakeClient({ answerForRequest }); const failed = root();
    try { await assert.rejects(() => collectCandidate({ config, root: failed.r, provider: "openai-api", model: "fake-model", allowLiveProvider: true, clientFactory: rejected.clientFactory }), /every local scorer decision must be accepted/); assert.equal(rejected.calls(), 24, `${name}: every local attempt remains available for review`); assert.equal(fs.existsSync(path.join(failed.r, "candidate-receipt-v6.json")), false, `${name}: no candidate receipt`); assert.equal(fs.existsSync(path.join(failed.r, "attempts")), true, `${name}: local evidence retained`); } finally { fs.rmSync(failed.p, { recursive: true, force: true }); }
  }
  const badUsage = fakeClient({ answerForRequest: ({ calls }) => acceptedAnswer(calls, cases), usageForRequest: index => index === 7 ? { input_tokens: 1024, output_tokens: 1, total_tokens: 1024 } : { input_tokens: 1024, output_tokens: 1, total_tokens: 1025 } });
  const invalidUsage = root(); try {
    await assert.rejects(() => collectCandidate({ config, root: invalidUsage.r, provider: "openai-api", model: "fake-model", allowLiveProvider: true, clientFactory: badUsage.clientFactory }), /native integral input_tokens, output_tokens and total_tokens/);
    assert.equal(badUsage.calls(), 8, "invalid native usage stops at its nested provider response"); assert.equal(fs.existsSync(path.join(invalidUsage.r, "candidate-receipt-v6.json")), false, "bad nested provider usage yields no receipt");
  } finally { fs.rmSync(invalidUsage.p, { recursive: true, force: true }); }
  for (const bad of [() => collectCandidate({ config, root: root().r, provider: "openai-api", model: "fake-model", clientFactory: accepted.clientFactory }), () => collectCandidate({ config: { ...config, provider: "nope" }, root: root().r, provider: "openai-api", model: "fake-model", allowLiveProvider: true, clientFactory: accepted.clientFactory }), () => collectCandidate({ config, root: root().r, provider: "openai-api", model: "wrong", allowLiveProvider: true, clientFactory: accepted.clientFactory })]) await assert.rejects(bad);
  assert.equal(accepted.calls(), 24);
  const y = root(); fs.mkdirSync(y.r); await assert.rejects(() => collectCandidate({ config, root: y.r, provider: "openai-api", model: "fake-model", allowLiveProvider: true, clientFactory: accepted.clientFactory }), /must not already exist/); fs.rmSync(y.p, { recursive: true, force: true });
  console.log("trusted-proof-live-candidate ok");
}
main().catch(e => { console.error(e.stack || e); process.exitCode = 1; });
