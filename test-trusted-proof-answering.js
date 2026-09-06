"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { EventEmitter } = require("node:events");
const { PassThrough } = require("node:stream");
const { assembleCondition, immutableInputs, rejectUnequalBeforeScoring } = require("./trusted-proof-preflight");
const { ASSEMBLED_PROMPT_TEMPLATE_SHA256, WRAPPER_TEMPLATE_SHA256 } = require("./providers/openai-answering");
const { prepareOpenAIAnsweringRun, prepareCodexExecAnsweringRun } = require("./trusted-proof-answering");

async function main() {
  const inputs = immutableInputs(), fixture = inputs.dataset.cases[0];
  const config = { source_commit: "f4b96bb52d43a1cf7f15ff229da40c7222110605", model: "fake-openai-model", base_prompt_sha256: ASSEMBLED_PROMPT_TEMPLATE_SHA256, wrapper_prompt_sha256: WRAPPER_TEMPLATE_SHA256, sampling: { temperature: 0, top_p: 1 }, retry_policy: "none", dataset_sha256: inputs.dataset_sha256, slot_registration_file_sha256: inputs.registration_sha256, slot_registration_sha256: inputs.binding.slot_registration_sha256 };
  const fakeTrusted = async () => ({ proof: { result: structuredClone(fixture.expected_result) } });
  const p0 = await assembleCondition({ fixture, inputs, config, condition: "P0", trustedQuery: fakeTrusted });
  const p1 = await assembleCondition({ fixture, inputs, config, condition: "P1", trustedQuery: fakeTrusted });
  let clients = 0, calls = 0, forwarded;
  const sdkUsage = { input_tokens: 41, input_tokens_details: { cache_write_tokens: 0, cached_tokens: 17 }, output_tokens: 6, output_tokens_details: { reasoning_tokens: 2 }, total_tokens: 47 };
  const clientFactory = () => { clients += 1; return { responses: { create: async request => { calls += 1; forwarded = request; return { model: config.model, output_text: "answer", usage: sdkUsage }; } } }; };
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "trusted-proof-answering-")), raw = path.join(root, "fresh");
  async function assertRejectedWithoutFinalMetadata(name, response, error) {
    const rawDirectory = path.join(root, name);
    const failed = prepareOpenAIAnsweringRun({ provider: "openai-api", allowLiveProvider: true, config, inputs, rawDirectory, clientFactory: () => ({ responses: { create: async () => response } }) });
    await assert.rejects(failed.run(p0), error);
    assert.equal(fs.existsSync(path.join(rawDirectory, "metadata.json")), false, `${name} must not write final metadata`);
  }
  assert.throws(() => prepareOpenAIAnsweringRun({ provider: "fake", allowLiveProvider: true, config, inputs, rawDirectory: raw, clientFactory }), /fixed provider/); assert.equal(clients, 0);
  assert.throws(() => prepareOpenAIAnsweringRun({ provider: "openai-api", allowLiveProvider: false, config, inputs, rawDirectory: raw, clientFactory }), /allow-live-provider/); assert.equal(clients, 0);
  const openaiMismatchRaw = path.join(root, "openai-provider-mismatch");
  assert.throws(() => prepareOpenAIAnsweringRun({ provider: "openai-api", allowLiveProvider: true, config: { ...config, provider: "codex-exec", sampling: { temperature: "not-reached", top_p: 1 } }, inputs, rawDirectory: openaiMismatchRaw, clientFactory: () => { throw new Error("OpenAI provider must not be constructed"); } }), /config\.provider must match selected provider/);
  assert.equal(fs.existsSync(openaiMismatchRaw), false, "OpenAI provider mismatch creates no raw directory");
  assert.throws(() => prepareOpenAIAnsweringRun({ provider: "openai-api", allowLiveProvider: true, config: { ...config, base_prompt_sha256: "0".repeat(64) }, inputs, rawDirectory: raw, clientFactory }), /wire template/); assert.equal(clients, 0);
  for (const [name, sampling, error] of [
    ["seed", { temperature: 0, top_p: 1, seed: 0 }, /exactly temperature and top_p/],
    ["missing", { temperature: 0 }, /exactly temperature and top_p/],
    ["extra", { temperature: 0, top_p: 1, frequency_penalty: 0 }, /exactly temperature and top_p/],
    ["non-number", { temperature: "0", top_p: 1 }, /finite numbers/],
    ["temperature-range", { temperature: 2.01, top_p: 1 }, /range \[0, 2\]/],
    ["top-p-range", { temperature: 0, top_p: -0.01 }, /range \[0, 1\]/],
  ]) {
    const invalidRaw = path.join(root, `invalid-${name}`);
    assert.throws(() => prepareOpenAIAnsweringRun({ provider: "openai-api", allowLiveProvider: true, config: { ...config, sampling }, inputs, rawDirectory: invalidRaw, clientFactory }), error);
    assert.equal(clients, 0, `${name}: invalid sampling never constructs a client`);
    assert.equal(fs.existsSync(invalidRaw), false, `${name}: invalid sampling creates no local receipt/evidence root`);
  }
  const run = prepareOpenAIAnsweringRun({ provider: "openai-api", allowLiveProvider: true, config, inputs, rawDirectory: raw, clientFactory });
  assert.equal(clients, 0, "client stays lazy after all gates");
  const r0 = await run.run(p0);
  assert.deepEqual(forwarded, { model: config.model, input: p0.prompt, temperature: config.sampling.temperature, top_p: config.sampling.top_p }, "sealed prompt and exact pinned sampling are forwarded with no wrapper/instructions");
  assert.equal(clients, 1); assert.equal(calls, 1); assert.equal(r0.response.usage.effective_context_budget, 41); assert.equal(r0.cdr_status, "not-a-cdr-receipt-v2");
  assert.deepEqual(r0.response.usage, { input_tokens: 41, output_tokens: 6, total_tokens: 47, effective_context_budget: 41 }, "canonical receipt projection excludes native detail counters");
  assert.equal(fs.readFileSync(r0.artifacts.prompt_file, "utf8"), p0.prompt);
  assert.throws(() => prepareOpenAIAnsweringRun({ provider: "openai-api", allowLiveProvider: true, config, inputs, rawDirectory: raw, clientFactory }), /must not already exist/);
  assert.throws(() => fs.writeFileSync(r0.artifacts.prompt_file, "changed", { flag: "wx" }), /EEXIST/);
  await assertRejectedWithoutFinalMetadata("absent-model", { output_text: "x", usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 } }, /must include model/);
  await assertRejectedWithoutFinalMetadata("blank-model", { model: " \t", output_text: "x", usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 } }, /non-empty text/);
  await assertRejectedWithoutFinalMetadata("mismatch", { model: "wrong-model", output_text: "x", usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 } }, /provider model/);
  await assertRejectedWithoutFinalMetadata("bad-usage", { model: config.model, output_text: "x", usage: { input_tokens: 1, output_tokens: 1, total_tokens: 3 } }, /reconciling non-negative native integral/);
  await assertRejectedWithoutFinalMetadata("negative-input", { model: config.model, output_text: "x", usage: { input_tokens: -1, output_tokens: 2, total_tokens: 1 } }, /reconciling non-negative native integral/);
  await assertRejectedWithoutFinalMetadata("negative-output", { model: config.model, output_text: "x", usage: { input_tokens: 2, output_tokens: -1, total_tokens: 1 } }, /reconciling non-negative native integral/);
  await assertRejectedWithoutFinalMetadata("negative-total", { model: config.model, output_text: "x", usage: { input_tokens: 1, output_tokens: 1, total_tokens: -2 } }, /reconciling non-negative native integral/);
  await assertRejectedWithoutFinalMetadata("unknown-usage", { model: config.model, output_text: "x", usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2, extra: 0 } }, /usage contains an unknown field/);
  await assertRejectedWithoutFinalMetadata("unknown-input-detail", { model: config.model, output_text: "x", usage: { input_tokens: 1, input_tokens_details: { cache_write_tokens: 0, cached_tokens: 0, extra: 0 }, output_tokens: 1, total_tokens: 2 } }, /input_tokens_details contains an unknown field/);
  await assertRejectedWithoutFinalMetadata("missing-input-detail", { model: config.model, output_text: "x", usage: { input_tokens: 1, input_tokens_details: { cached_tokens: 0 }, output_tokens: 1, total_tokens: 2 } }, /must contain exactly cache_write_tokens and cached_tokens/);
  await assertRejectedWithoutFinalMetadata("negative-output-detail", { model: config.model, output_text: "x", usage: { input_tokens: 1, output_tokens: 1, output_tokens_details: { reasoning_tokens: -1 }, total_tokens: 2 } }, /output_tokens_details must contain non-negative native integral counters/);
  const p1run = prepareOpenAIAnsweringRun({ provider: "openai-api", allowLiveProvider: true, config, inputs, rawDirectory: path.join(root, "p1"), clientFactory: () => ({ responses: { create: async () => ({ model: config.model, output_text: "answer", usage: { input_tokens: 42, output_tokens: 6, total_tokens: 48 } }) } }) });
  const r1 = await p1run.run(p1);
  assert.throws(() => rejectUnequalBeforeScoring([{ condition: "P0", ...r0.response }, { condition: "P1", ...r1.response }]), /unequal measured E/);
  const leakRun = prepareOpenAIAnsweringRun({ provider: "openai-api", allowLiveProvider: true, config, inputs, rawDirectory: path.join(root, "leak"), clientFactory });
  await assert.rejects(leakRun.run({ ...p0, prompt: `${p0.prompt}${fixture.hidden_answer_contract.allowed}` }), /unsealed or reconstructed assembly/); assert.equal(calls, 1, "leaked reconstruction never reaches client");
  let spawns = 0, codexCall;
  const fakeSpawn = (binary, args, options) => {
    spawns += 1; codexCall = { binary, args, options };
    const child = new EventEmitter(); child.stdout = new PassThrough(); child.stderr = new PassThrough();
    process.nextTick(() => {
      const finalFile = args[args.indexOf("--output-last-message") + 1];
      fs.writeFileSync(finalFile, JSON.stringify({ answer: "codex answer" }));
      child.stdout.end(`${JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: "ignored: final capture is authoritative" } })}\n${JSON.stringify({ type: "turn.completed", usage: { input_tokens: 51, output_tokens: 7, total_tokens: 58 } })}\n`);
      child.stderr.end("fake diagnostic\n"); child.emit("close", 0);
    });
    return child;
  };
  const codexRaw = path.join(root, "codex");
  assert.throws(() => prepareCodexExecAnsweringRun({ provider: "codex-exec", allowLiveProvider: false, config, inputs, rawDirectory: codexRaw, spawnImpl: fakeSpawn }), /allow-live-provider/);
  const codexMismatchRaw = path.join(root, "codex-provider-mismatch");
  assert.throws(() => prepareCodexExecAnsweringRun({ provider: "codex-exec", allowLiveProvider: true, config: { ...config, provider: "openai-api" }, inputs, rawDirectory: codexMismatchRaw, spawnImpl: () => { throw new Error("Codex provider must not be constructed or spawned"); } }), /config\.provider must match selected provider/);
  assert.equal(fs.existsSync(codexMismatchRaw), false, "Codex provider mismatch creates no raw directory");
  assert.equal(spawns, 0, "Codex provider mismatch never spawns");
  const codexRun = prepareCodexExecAnsweringRun({ provider: "codex-exec", allowLiveProvider: true, config, inputs, rawDirectory: codexRaw, spawnImpl: fakeSpawn, binary: "fake-codex" });
  assert.equal(spawns, 0, "Codex is not spawned until the sealed run reaches its transport");
  const codexResult = await codexRun.run(p0);
  assert.equal(spawns, 1); assert.equal(codexCall.binary, "fake-codex");
  assert.deepEqual(codexCall.args.slice(0, 5), ["exec", "--ephemeral", "--sandbox", "read-only", "--json"]);
  assert.equal(codexCall.args.at(-1), p0.prompt, "sealed prompt is the sole Codex task text");
  assert.equal(codexCall.args[codexCall.args.indexOf("--model") + 1], config.model);
  assert.equal(codexCall.options.stdio[0], "ignore");
  assert.equal(codexResult.response.answer, "codex answer");
  assert.deepEqual(codexResult.response.usage, { input_tokens: 51, output_tokens: 7, total_tokens: 58, effective_context_budget: 51 });
  for (const name of ["codex-final-answer-schema.json", "codex-final-output.json", "codex-stdout.jsonl", "codex-stderr.txt"]) assert.equal(fs.existsSync(path.join(codexRaw, name)), true, `${name} is retained locally`);
  console.log("trusted-proof-answering ok: lazy gated fake OpenAI transport, exact wire, native E, local non-overwrite evidence, mismatch and leak rejection");
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
