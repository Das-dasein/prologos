"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { ACTIVE_ONTOLOGY } = require("./ontology-registry");
const { ACTIVE_GROUNDING_POLICY } = require("./predicate-grounding-policy");
const { collect, loadControl } = require("./product-extraction-v5-identity-control.cjs");

const fixtureFile = path.join(__dirname, ".cdr/waves/product-extraction-v5-identity-control-v1/fixture.jsonl");
const goldFile = path.join(__dirname, ".cdr/waves/product-extraction-v5-identity-control-v1/gold.jsonl");
const control = loadControl(fixtureFile, goldFile);

function responseFor(index) {
  const source = control.fixture[index];
  const expected = control.gold[index];
  return {
    output_text: JSON.stringify({
      schema_version: "memory-extraction-v5",
      registry_identity: ACTIVE_ONTOLOGY.identity,
      policy_identity: ACTIVE_GROUNDING_POLICY.identity,
      decision: expected.expected_decision,
      clarification: expected.expected_decision === "clarify" ? { question: "Which admitted Latin identity should be used?", evidence_span: source.source_text } : null,
      assertions: expected.assertions.map(item => ({ ...item, confidence: 0.9, evidence_span: source.source_text })),
      ontology_candidates: [],
    }),
    usage: { input_tokens: 1, cached_input_tokens: 0, output_tokens: 1 },
    stdout: "{}\n",
    stderr: "",
  };
}

(async () => {
  const model = "fake-v5-identity";
  const previous = process.env.CODEX_MODEL;
  process.env.CODEX_MODEL = model;
  let calls = 0;
  const report = await collect({ fixtureFile, goldFile, model, outputRoot: path.join(fs.mkdtempSync(path.join(os.tmpdir(), "pam-v5-identity-")), "report"), invoke: async () => responseFor(calls++) });
  assert.equal(calls, 16);
  assert.equal(report.summary.semantic_case_exact.numerator, 16);
  assert.equal(report.summary.final_gate_accuracy.numerator, 16);
  assert.equal(report.summary.harmful_writes_eligible, 0);

  const resumeRoot = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "pam-v5-identity-resume-")), "report");
  let attempts = 0;
  await assert.rejects(() => collect({ fixtureFile, goldFile, model, outputRoot: resumeRoot, invoke: async () => {
    const index = attempts++;
    if (index === 4) throw new Error("simulated identity interruption");
    return responseFor(index);
  } }), /simulated identity interruption/);
  let resumedCalls = 0;
  const resumed = await collect({ fixtureFile, goldFile, model, outputRoot: resumeRoot, resume: true, invoke: async () => responseFor(4 + resumedCalls++) });
  if (previous === undefined) delete process.env.CODEX_MODEL;
  else process.env.CODEX_MODEL = previous;
  assert.equal(resumedCalls, 12);
  assert.equal(resumed.provider_calls, 16);
  assert.equal(resumed.summary.final_gate_accuracy.numerator, 16);
  console.log("product extraction v5 identity control ok: 16 fake cases, policy gate scoring, and sealed resume");
})().catch(error => { console.error(error); process.exitCode = 1; });
