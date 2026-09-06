"use strict";

const assert = require("node:assert/strict"), fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const { collectCandidate, loadConfig } = require("./trusted-proof-live-candidate");
const { immutableInputs } = require("./trusted-proof-preflight");
const configPath = path.join(__dirname, "trusted-proof-live-candidate-config-v7.json");
function root() { const p = fs.mkdtempSync(path.join(os.tmpdir(), "pam-live-parent-")); return { p, r: path.join(p, "fresh-root") }; }
const detailedUsage = () => ({ input_tokens: 1024, input_tokens_details: { cache_write_tokens: 0, cached_tokens: 16 }, output_tokens: 1, output_tokens_details: { reasoning_tokens: 0 }, total_tokens: 1025 });
function fakeClient({ answerForRequest, usageForRequest = detailedUsage }) {
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
    assert.equal(accepted.calls(), 24); assert.equal(out.records, 24); assert.equal(out.integrity.status, "candidate-integrity-valid-not-a-result-v7");
    const receipt = JSON.parse(fs.readFileSync(out.receipt_file));
    assert.equal(path.basename(out.receipt_file), "candidate-receipt-v7.json"); assert.equal(receipt.schema_version, "cognitive-proof-eval-receipt-intake-v7"); assert.equal(receipt.records.length, 24);
    assert.ok(receipt.records.every(record => record.scorer.decision === "accepted"));
    assert.ok(receipt.records.every(record => record.usage.measured_effective_context_budget === record.usage.provider_usage.input_tokens && record.usage.provider_usage.total_tokens === record.usage.provider_usage.input_tokens + record.usage.provider_usage.output_tokens), "v7 receipt preserves reconciled native usage and E=input after accepting real detail-shaped usage");
    assert.deepEqual(receipt.records.filter((_, i) => i % 2 === 0).map(r => r.condition), Array(12).fill("P0"));
    assert.equal(new Set(receipt.records.flatMap(r => [r.prompt.ref, r.raw.ref])).size, 48);
  } finally { fs.rmSync(x.p, { recursive: true, force: true }); }
  for (const [name, answerForRequest] of [["all rejected", () => "fake"], ["mixed rejected", ({ calls }) => calls === 7 ? "fake" : acceptedAnswer(calls, cases)]]) {
    const rejected = fakeClient({ answerForRequest }); const failed = root();
    try { await assert.rejects(() => collectCandidate({ config, root: failed.r, provider: "openai-api", model: "fake-model", allowLiveProvider: true, clientFactory: rejected.clientFactory }), /every local scorer decision must be accepted/); assert.equal(rejected.calls(), 24, `${name}: every local attempt remains available for review`); assert.equal(fs.existsSync(path.join(failed.r, "candidate-receipt-v7.json")), false, `${name}: no candidate receipt`); assert.equal(fs.existsSync(path.join(failed.r, "attempts")), true, `${name}: local evidence retained`); } finally { fs.rmSync(failed.p, { recursive: true, force: true }); }
  }
  const missingProof = fakeClient({ answerForRequest: ({ calls }) => calls === 1 ? cases[0].hidden_answer_contract.allowed : acceptedAnswer(calls, cases) }); const proofFailure = root(); try {
    await assert.rejects(() => collectCandidate({ config, root: proofFailure.r, provider: "openai-api", model: "fake-model", allowLiveProvider: true, clientFactory: missingProof.clientFactory }), /every local scorer decision must be accepted/);
    assert.equal(missingProof.calls(), 24); assert.equal(fs.existsSync(path.join(proofFailure.r, "candidate-receipt-v7.json")), false, "missing P1 proof provenance yields no receipt");
  } finally { fs.rmSync(proofFailure.p, { recursive: true, force: true }); }
  const unequalE = fakeClient({ answerForRequest: ({ calls }) => acceptedAnswer(calls, cases), usageForRequest: index => index === 1 ? { ...detailedUsage(), input_tokens: 1023, total_tokens: 1024 } : detailedUsage() }); const unequal = root(); try {
    await assert.rejects(() => collectCandidate({ config, root: unequal.r, provider: "openai-api", model: "fake-model", allowLiveProvider: true, clientFactory: unequalE.clientFactory }), /immutable binding or E mismatch/);
    assert.equal(unequalE.calls(), 2); assert.equal(fs.existsSync(path.join(unequal.r, "candidate-receipt-v7.json")), false, "unequal P0/P1 E yields no receipt");
  } finally { fs.rmSync(unequal.p, { recursive: true, force: true }); }
  const badUsage = fakeClient({ answerForRequest: ({ calls }) => acceptedAnswer(calls, cases), usageForRequest: index => index === 7 ? { input_tokens: 1024, output_tokens: 1, total_tokens: 1024 } : detailedUsage() });
  const invalidUsage = root(); try {
    await assert.rejects(() => collectCandidate({ config, root: invalidUsage.r, provider: "openai-api", model: "fake-model", allowLiveProvider: true, clientFactory: badUsage.clientFactory }), /native integral input_tokens, output_tokens and total_tokens/);
    assert.equal(badUsage.calls(), 8, "invalid native usage stops at its nested provider response"); assert.equal(fs.existsSync(path.join(invalidUsage.r, "candidate-receipt-v7.json")), false, "bad nested provider usage yields no receipt");
  } finally { fs.rmSync(invalidUsage.p, { recursive: true, force: true }); }
  for (const mutate of [usage => { usage.input_tokens_details.extra = 0; }, usage => { delete usage.input_tokens_details.cached_tokens; }, usage => { usage.output_tokens_details.reasoning_tokens = .5; }, usage => { usage.extra = 0; }]) {
    const badDetail = fakeClient({ answerForRequest: ({ calls }) => acceptedAnswer(calls, cases), usageForRequest: () => { const usage = detailedUsage(); mutate(usage); return usage; } }); const invalidDetail = root(); try {
      await assert.rejects(() => collectCandidate({ config, root: invalidDetail.r, provider: "openai-api", model: "fake-model", allowLiveProvider: true, clientFactory: badDetail.clientFactory }), /OpenAI response usage/);
      assert.equal(badDetail.calls(), 1); assert.equal(fs.existsSync(path.join(invalidDetail.r, "candidate-receipt-v7.json")), false, "arbitrary usage detail mutation yields no receipt");
    } finally { fs.rmSync(invalidDetail.p, { recursive: true, force: true }); }
  }
  for (const [name, options] of [["missing live gate", { config, provider: "openai-api", model: "fake-model" }], ["provider config", { config: { ...config, provider: "nope" }, provider: "openai-api", model: "fake-model", allowLiveProvider: true }], ["model", { config, provider: "openai-api", model: "wrong", allowLiveProvider: true }]]) {
    const invalid = root(); try {
      await assert.rejects(() => collectCandidate({ ...options, root: invalid.r, clientFactory: accepted.clientFactory }));
      assert.equal(fs.existsSync(invalid.r), false, `${name}: preflight failure creates neither root nor receipt`);
    } finally { fs.rmSync(invalid.p, { recursive: true, force: true }); }
  }
  assert.equal(accepted.calls(), 24);
  const y = root(); try { fs.mkdirSync(y.r); await assert.rejects(() => collectCandidate({ config, root: y.r, provider: "openai-api", model: "fake-model", allowLiveProvider: true, clientFactory: accepted.clientFactory }), /must not already exist/); assert.equal(fs.existsSync(path.join(y.r, "candidate-receipt-v7.json")), false, "existing root yields no receipt"); } finally { fs.rmSync(y.p, { recursive: true, force: true }); }
  console.log("trusted-proof-live-candidate ok");
}
main().catch(e => { console.error(e.stack || e); process.exitCode = 1; });
