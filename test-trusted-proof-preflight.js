"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  assembleCondition, executeWithInjectedProvider, immutableInputs, rejectUnequalBeforeScoring,
  resultEnvelope, scoreHiddenContract, validateLiveGate, writeArtifact,
} = require("./trusted-proof-preflight");

async function main() {
  const inputs = immutableInputs();
  const fixture = inputs.dataset.cases[0];
  const config = {
    source_commit: "f4b96bb52d43a1cf7f15ff229da40c7222110605", model: "fake-model-v1",
    base_prompt_sha256: "a".repeat(64), wrapper_prompt_sha256: "b".repeat(64), sampling: { temperature: 0 },
    retry_policy: "none",
    dataset_sha256: inputs.dataset_sha256, slot_registration_file_sha256: inputs.registration_sha256,
    slot_registration_sha256: inputs.binding.slot_registration_sha256,
  };
  let trustedCalls = 0, providerCalls = 0;
  const fakeTrusted = async ({ snapshot, goal }) => { trustedCalls += 1; return require("./cognitive-memory").runTrustedQuery({ snapshot, goal }); };
  const p0 = await assembleCondition({ fixture, inputs, config, condition: "P0", trustedQuery: fakeTrusted });
  assert.equal(trustedCalls, 0, "P0 must not query trusted runtime");
  const p1 = await assembleCondition({ fixture, inputs, config, condition: "P1", trustedQuery: fakeTrusted });
  assert.equal(trustedCalls, 1, "P1 must query trusted runtime exactly once");
  assert.equal(p0.pair.prefix, p1.pair.prefix); assert.equal(p0.pair.suffix, p1.pair.suffix);
  assert.match(p0.prompt.slice(p0.slotStart, p0.slotEnd), /^~+$/);
  assert.equal(p1.pair.declaredSlotBytes, inputs.dataset.evidence_slots[fixture.id]);
  const fakeProvider = { complete: async ({ prompt }) => { providerCalls += 1; return { raw: "fake raw", answer: "orion is affected; cite turn(12), turn(31), and turn(33); rule turn(32)", usage: { input_tokens: 17, output_tokens: 3, total_tokens: 20, effective_context_budget: 20 } }; } };
  const r0 = await executeWithInjectedProvider(p0, fakeProvider), r1 = await executeWithInjectedProvider(p1, fakeProvider);
  assert.equal(providerCalls, 2); assert.equal(r0.equality_digest, r1.equality_digest);
  assert.doesNotThrow(() => rejectUnequalBeforeScoring([{ condition: "P0", ...r0 }, { condition: "P1", ...r1 }]));
  const unequal = { ...r1, usage: { ...r1.usage, effective_context_budget: 21 } };
  assert.throws(() => rejectUnequalBeforeScoring([{ condition: "P0", ...r0 }, { condition: "P1", ...unequal }]), /unequal measured E rejected before scoring/);
  const leaked = { ...p0, prompt: `${p0.prompt}${fixture.hidden_answer_contract.allowed}`, slotStart: p0.slotStart, slotEnd: p0.slotEnd };
  await assert.rejects(executeWithInjectedProvider(leaked, fakeProvider), /oracle leakage rejected before provider call/);
  assert.equal(providerCalls, 2, "leakage must abort before provider call");
  const p1OutsideSlotLeak = { ...p1, prompt: `${p1.prompt}${fixture.hidden_answer_contract.allowed}`, slotStart: p1.slotStart, slotEnd: p1.slotEnd };
  await assert.rejects(executeWithInjectedProvider(p1OutsideSlotLeak, fakeProvider), /oracle leakage rejected before provider call/);
  assert.equal(providerCalls, 2, "P1 outside-slot leakage must abort before provider call");
  const missingRetry = { ...config }; delete missingRetry.retry_policy;
  await assert.rejects(assembleCondition({ fixture, inputs, config: missingRetry, condition: "P0" }), /config.retry_policy must be non-empty text/);
  const changedRetryConfig = { ...config, retry_policy: "one_retry" };
  const changedRetryP1 = await assembleCondition({ fixture, inputs, config: changedRetryConfig, condition: "P1", trustedQuery: fakeTrusted });
  const changedRetryResponse = await executeWithInjectedProvider(changedRetryP1, fakeProvider);
  assert.notEqual(r0.equality_digest, changedRetryResponse.equality_digest);
  assert.throws(() => rejectUnequalBeforeScoring([{ condition: "P0", ...r0 }, { condition: "P1", ...changedRetryResponse }]), /retry policy mismatch rejected before scoring/);
  const score = scoreHiddenContract({ answer: r1.answer, fixture, trustedResult: p1.trusted_result });
  assert.equal(score.answer_correct, true); assert.equal(score.provenance_complete, true);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "trusted-proof-preflight-"));
  const envelope = resultEnvelope({ assembled: p1, response: r1, scorer_outcome: score });
  assert.equal(envelope.retry_policy, "none");
  const written = writeArtifact({ directory: temp, name: "p1", envelope, raw: r1.raw });
  assert.equal(JSON.parse(fs.readFileSync(written.envelope_file, "utf8")).raw_ref, "p1.raw.txt");
  assert.throws(() => writeArtifact({ directory: temp, name: "p1", envelope, raw: r1.raw }), /EEXIST/);
  assert.throws(() => validateLiveGate({ provider: fakeProvider, config, inputs }), /--allow-live-provider/);
  assert.throws(() => validateLiveGate({ allowLiveProvider: true, config, inputs }), /explicit provider/);
  assert.deepEqual(validateLiveGate({ provider: fakeProvider, allowLiveProvider: true, config, inputs }), { allowed_to_construct_adapter: true, invocation_implemented: false });
  console.log("trusted-proof-preflight ok: immutable slots, P1-only proof, pre-call leak abort, fake measured-E equality, hidden scoring, raw envelope non-overwrite, and no-live gates");
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
