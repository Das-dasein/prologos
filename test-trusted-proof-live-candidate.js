"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const { collectCandidate, loadConfig } = require("./trusted-proof-live-candidate");
const { immutableInputs } = require("./trusted-proof-preflight");
const configPath = path.join(__dirname, "trusted-proof-live-candidate-config-v3.json");
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
function acceptedAnswer(calls, cases) {
  const fixture = cases[Math.floor(calls / 2)];
  return fixture.hidden_answer_contract.allowed + (calls % 2 ? `\n${JSON.stringify(fixture.expected_result)}` : "");
}
async function main() {
  const config = { ...loadConfig(configPath), model: "fake-model" };
  const cases = [...immutableInputs().dataset.cases].sort((a, b) => a.id.localeCompare(b.id));
  const accepted = fakeClient({ answerForRequest: ({ calls, model, input }) => { assert.equal(model, "fake-model"); assert.equal(typeof input, "string"); return acceptedAnswer(calls, cases); } });
  const x = root(); try { const out = await collectCandidate({ config, root: x.r, provider: "openai-api", model: "fake-model", allowLiveProvider: true, clientFactory: accepted.clientFactory }); assert.equal(accepted.calls(), 24); assert.equal(out.records, 24); assert.equal(out.integrity.status, "candidate-integrity-valid-not-a-result-v3"); const receipt = JSON.parse(fs.readFileSync(out.receipt_file)); assert.equal(receipt.records.length, 24); assert.ok(receipt.records.every(record => record.scorer.decision === "accepted")); assert.deepEqual(receipt.records.filter((_, i) => i % 2 === 0).map(r => r.condition), Array(12).fill("P0")); assert.equal(new Set(receipt.records.flatMap(r => [r.prompt.ref, r.raw.ref])).size, 48); } finally { fs.rmSync(x.p, { recursive: true, force: true }); }
  for (const [name, answerForRequest] of [["all rejected", () => "fake"], ["mixed rejected", ({ calls }) => calls === 7 ? "fake" : acceptedAnswer(calls, cases)]]) {
    const rejected = fakeClient({ answerForRequest }); const failed = root();
    try { await assert.rejects(() => collectCandidate({ config, root: failed.r, provider: "openai-api", model: "fake-model", allowLiveProvider: true, clientFactory: rejected.clientFactory }), /every local scorer decision must be accepted/); assert.equal(rejected.calls(), 24, `${name}: every local attempt remains available for review`); assert.equal(fs.existsSync(path.join(failed.r, "candidate-receipt-v3.json")), false, `${name}: no candidate receipt`); assert.equal(fs.existsSync(path.join(failed.r, "attempts")), true, `${name}: local evidence retained`); } finally { fs.rmSync(failed.p, { recursive: true, force: true }); }
  }
  for (const bad of [() => collectCandidate({ config, root: root().r, provider: "openai-api", model: "fake-model", clientFactory: accepted.clientFactory }), () => collectCandidate({ config: { ...config, provider: "nope" }, root: root().r, provider: "openai-api", model: "fake-model", allowLiveProvider: true, clientFactory: accepted.clientFactory }), () => collectCandidate({ config, root: root().r, provider: "openai-api", model: "wrong", allowLiveProvider: true, clientFactory: accepted.clientFactory })]) await assert.rejects(bad); assert.equal(accepted.calls(), 24);
  const y = root(); fs.mkdirSync(y.r); await assert.rejects(() => collectCandidate({ config, root: y.r, provider: "openai-api", model: "fake-model", allowLiveProvider: true, clientFactory: accepted.clientFactory }), /must not already exist/); fs.rmSync(y.p, { recursive: true, force: true });
  const z = root(); let n = 0; const mismatch = () => ({ responses: { create: async ({ model }) => { const input_tokens = n++ === 0 ? 100 : 101; return { model, output_text: "x", usage: { input_tokens, output_tokens: 1, total_tokens: input_tokens + 1 } }; } } }); await assert.rejects(() => collectCandidate({ config, root: z.r, provider: "openai-api", model: "fake-model", allowLiveProvider: true, clientFactory: mismatch }), /mismatch/); assert.equal(fs.existsSync(path.join(z.r, "candidate-receipt-v3.json")), false); fs.rmSync(z.p, { recursive: true, force: true });
  console.log("trusted-proof-live-candidate ok");
}
main().catch(e => { console.error(e.stack || e); process.exitCode = 1; });
