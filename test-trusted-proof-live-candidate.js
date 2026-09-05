"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const { collectCandidate, loadConfig } = require("./trusted-proof-live-candidate");
const configPath = path.join(__dirname, "trusted-proof-live-candidate-config-v3.json");
function root() { const p = fs.mkdtempSync(path.join(os.tmpdir(), "pam-live-parent-")); return { p, r: path.join(p, "fresh-root") }; }
async function main() {
  const config = { ...loadConfig(configPath), model: "fake-model" }; let calls = 0;
  const clientFactory = () => ({ responses: { create: async ({ model, input }) => { calls++; assert.equal(model, "fake-model"); assert.equal(typeof input, "string"); return { model, output_text: "fake", usage: { input_tokens: 1024, output_tokens: 1, total_tokens: 1025 } }; } } });
  const x = root(); try { const out = await collectCandidate({ config, root: x.r, provider: "openai-api", model: "fake-model", allowLiveProvider: true, clientFactory }); assert.equal(calls, 24); assert.equal(out.records, 24); assert.equal(out.integrity.status, "candidate-integrity-valid-not-a-result-v3"); const receipt = JSON.parse(fs.readFileSync(out.receipt_file)); assert.equal(receipt.records.length, 24); assert.deepEqual(receipt.records.filter((_, i) => i % 2 === 0).map(r => r.condition), Array(12).fill("P0")); assert.equal(new Set(receipt.records.flatMap(r => [r.prompt.ref, r.raw.ref])).size, 48); } finally { fs.rmSync(x.p, { recursive: true, force: true }); }
  for (const bad of [() => collectCandidate({ config, root: root().r, provider: "openai-api", model: "fake-model", clientFactory }), () => collectCandidate({ config: { ...config, provider: "nope" }, root: root().r, provider: "openai-api", model: "fake-model", allowLiveProvider: true, clientFactory }), () => collectCandidate({ config, root: root().r, provider: "openai-api", model: "wrong", allowLiveProvider: true, clientFactory })]) await assert.rejects(bad); assert.equal(calls, 24);
  const y = root(); fs.mkdirSync(y.r); await assert.rejects(() => collectCandidate({ config, root: y.r, provider: "openai-api", model: "fake-model", allowLiveProvider: true, clientFactory }), /must not already exist/); fs.rmSync(y.p, { recursive: true, force: true });
  const z = root(); let n = 0; const mismatch = () => ({ responses: { create: async ({ model }) => { const input_tokens = n++ === 0 ? 100 : 101; return { model, output_text: "x", usage: { input_tokens, output_tokens: 1, total_tokens: input_tokens + 1 } }; } } }); await assert.rejects(() => collectCandidate({ config, root: z.r, provider: "openai-api", model: "fake-model", allowLiveProvider: true, clientFactory: mismatch }), /mismatch/); assert.equal(fs.existsSync(path.join(z.r, "candidate-receipt-v3.json")), false); fs.rmSync(z.p, { recursive: true, force: true });
  console.log("trusted-proof-live-candidate ok");
}
main().catch(e => { console.error(e.stack || e); process.exitCode = 1; });
