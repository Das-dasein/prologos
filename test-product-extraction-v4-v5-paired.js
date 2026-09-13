"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { ACTIVE_ONTOLOGY } = require("./ontology-registry");
const { ACTIVE_GROUNDING_POLICY } = require("./predicate-grounding-policy");
const { collect, loadControl } = require("./product-extraction-v4-v5-paired-eval.cjs");

const fixtureFile = path.join(__dirname, ".cdr/waves/product-extraction-v4-v5-paired-control-v1/fixture.jsonl");
const goldFile = path.join(__dirname, ".cdr/waves/product-extraction-v4-v5-paired-control-v1/gold.jsonl");
const control = loadControl(fixtureFile, goldFile);
const order = control.fixture.flatMap(row => row.condition_order.map(condition => ({ case_id: row.case_id, condition })));

function responseFor(index) {
  const current = order[index];
  const caseIndex = control.fixture.findIndex(row => row.case_id === current.case_id);
  const source = control.fixture[caseIndex];
  const expected = control.gold[caseIndex];
  const candidate = {
    schema_version: current.condition === "v4" ? "memory-extraction-v4" : "memory-extraction-v5",
    registry_identity: ACTIVE_ONTOLOGY.identity,
    ...(current.condition === "v5" ? { policy_identity: ACTIVE_GROUNDING_POLICY.identity } : {}),
    decision: expected.expected_decision,
    clarification: expected.expected_decision === "clarify" ? { question: "What Latin identity should be used for Кэндзи?", evidence_span: source.source_text } : null,
    assertions: expected.assertions.map(item => ({ ...item, confidence: 0.9, evidence_span: source.source_text })),
    ontology_candidates: [],
  };
  return { output_text: JSON.stringify(candidate), usage: { input_tokens: 1, cached_input_tokens: 0, output_tokens: 1 }, stdout: "{}\n", stderr: "" };
}

(async () => {
  const model = "fake-product-extraction-v4-v5";
  const previous = process.env.CODEX_MODEL;
  process.env.CODEX_MODEL = model;
  let calls = 0;
  const report = await collect({
    fixtureFile,
    goldFile,
    model,
    outputRoot: path.join(fs.mkdtempSync(path.join(os.tmpdir(), "pam-v4-v5-paired-")), "report"),
    invoke: async () => responseFor(calls++),
  });
  assert.equal(calls, 40);
  assert.equal(report.summary.v4.semantic_case_exact.numerator, 20);
  assert.equal(report.summary.v5.semantic_case_exact.numerator, 20);
  assert.equal(report.admission_writes, 0);

  const resumeRoot = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "pam-v4-v5-resume-")), "report");
  let attempts = 0;
  await assert.rejects(() => collect({
    fixtureFile,
    goldFile,
    model,
    outputRoot: resumeRoot,
    invoke: async () => {
      const index = attempts++;
      if (index === 5) throw new Error("simulated paired interruption");
      return responseFor(index);
    },
  }), /simulated paired interruption/);
  let resumedCalls = 0;
  const resumed = await collect({
    fixtureFile,
    goldFile,
    model,
    outputRoot: resumeRoot,
    resume: true,
    invoke: async () => responseFor(5 + resumedCalls++),
  });
  if (previous === undefined) delete process.env.CODEX_MODEL;
  else process.env.CODEX_MODEL = previous;
  assert.equal(resumedCalls, 35);
  assert.equal(resumed.provider_calls, 40);
  assert.equal(resumed.summary.v5.semantic_case_exact.numerator, 20);
  console.log("product extraction v4/v5 paired eval ok: 40 counterbalanced fake calls and sealed resume");
})().catch(error => { console.error(error); process.exitCode = 1; });
