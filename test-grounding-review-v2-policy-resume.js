"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { ACTIVE_GROUNDING_POLICY } = require("./predicate-grounding-policy");
const { collect, loadControl } = require("./grounding-review-v2-policy-eval.cjs");

(async () => {
  const fixtureFile = path.join(__dirname, ".cdr/waves/memory-grounding-review-v2-policy-control-v1/fixture.jsonl");
  const goldFile = path.join(__dirname, ".cdr/waves/memory-grounding-review-v2-policy-control-v1/gold.jsonl");
  const control = loadControl(fixtureFile, goldFile);
  const outputRoot = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "pam-grounding-review-resume-")), "report");
  const model = "fake-grounding-review-v2-policy-resume";
  const previous = process.env.CODEX_MODEL;
  process.env.CODEX_MODEL = model;
  let attempts = 0;

  const responseFor = index => ({
    output_text: JSON.stringify({
      schema_version: "memory-grounding-review-v2",
      candidate_sha256: control.fixture[index].candidate_sha256,
      policy_identity: ACTIVE_GROUNDING_POLICY.identity,
      reviews: control.gold[index].reviews.map(item => ({ ...item, evidence_span: control.fixture[index].source_text, reason: "Deterministic resume fixture" })),
    }),
    usage: { input_tokens: 1, cached_input_tokens: 0, output_tokens: 1 },
    stdout: "{}\n",
    stderr: "",
  });

  await assert.rejects(() => collect({
    fixtureFile,
    goldFile,
    model,
    outputRoot,
    invoke: async () => {
      const index = attempts++;
      if (index === 3) throw new Error("simulated provider interruption");
      return responseFor(index);
    },
  }), /simulated provider interruption/);
  assert.equal(fs.readFileSync(path.join(outputRoot, "records.jsonl"), "utf8").trim().split(/\r?\n/).length, 3);

  let resumedCalls = 0;
  const report = await collect({
    fixtureFile,
    goldFile,
    model,
    outputRoot,
    resume: true,
    invoke: async () => responseFor(3 + resumedCalls++),
  });
  if (previous === undefined) delete process.env.CODEX_MODEL;
  else process.env.CODEX_MODEL = previous;
  assert.equal(resumedCalls, 21);
  assert.equal(report.provider_calls, 24);
  assert.equal(report.summary.verdict_accuracy.numerator, 24);
  console.log("grounding review v2 policy resume ok: 3 sealed records reused, 21 remaining calls completed");
})().catch(error => { console.error(error); process.exitCode = 1; });
