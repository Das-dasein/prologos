"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const { collectCandidate, loadConfig } = require("./trusted-proof-live-candidate");
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
async function main() {
  const config = { ...loadConfig(configPath), model: "fake-model" };
  const accepted = fakeClient({ answerForRequest: ({ model, input }) => { assert.equal(model, "fake-model"); assert.equal(typeof input, "string"); return "unused"; } });
  const x = root(); try {
    await assert.rejects(() => collectCandidate({ config, root: x.r, provider: "openai-api", model: "fake-model", allowLiveProvider: true, clientFactory: accepted.clientFactory }), /pinned transport source/);
    assert.equal(accepted.calls(), 0, "v3 source drift blocks the former 24-record path before client construction");
    assert.equal(fs.existsSync(x.r), false, "v3 source drift creates no candidate root or receipt");
  } finally { fs.rmSync(x.p, { recursive: true, force: true }); }
  for (const [name, sampling] of [["seed", { temperature: 0, top_p: 1, seed: 0 }], ["missing", { temperature: 0 }], ["extra", { temperature: 0, top_p: 1, extra: 0 }], ["non-number", { temperature: "0", top_p: 1 }], ["temperature-range", { temperature: 3, top_p: 1 }], ["top-p-range", { temperature: 0, top_p: 2 }]]) {
    const invalid = root();
    try { await assert.rejects(() => collectCandidate({ config: { ...config, sampling }, root: invalid.r, provider: "openai-api", model: "fake-model", allowLiveProvider: true, clientFactory: accepted.clientFactory }), /sampling/); assert.equal(accepted.calls(), 0, `${name}: no client`); assert.equal(fs.existsSync(invalid.r), false, `${name}: no root/receipt`); } finally { fs.rmSync(invalid.p, { recursive: true, force: true }); }
  }
  for (const bad of [() => collectCandidate({ config, root: root().r, provider: "openai-api", model: "fake-model", clientFactory: accepted.clientFactory }), () => collectCandidate({ config: { ...config, provider: "nope" }, root: root().r, provider: "openai-api", model: "fake-model", allowLiveProvider: true, clientFactory: accepted.clientFactory }), () => collectCandidate({ config, root: root().r, provider: "openai-api", model: "wrong", allowLiveProvider: true, clientFactory: accepted.clientFactory })]) await assert.rejects(bad); assert.equal(accepted.calls(), 0);
  const y = root(); fs.mkdirSync(y.r); await assert.rejects(() => collectCandidate({ config, root: y.r, provider: "openai-api", model: "fake-model", allowLiveProvider: true, clientFactory: accepted.clientFactory }), /must not already exist/); fs.rmSync(y.p, { recursive: true, force: true });
  const z = root(); try { await assert.rejects(() => collectCandidate({ config, root: z.r, provider: "openai-api", model: "fake-model", allowLiveProvider: true, clientFactory: accepted.clientFactory }), /pinned transport source/); assert.equal(fs.existsSync(path.join(z.r, "candidate-receipt-v3.json")), false); } finally { fs.rmSync(z.p, { recursive: true, force: true }); }
  console.log("trusted-proof-live-candidate ok");
}
main().catch(e => { console.error(e.stack || e); process.exitCode = 1; });
