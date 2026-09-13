"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { collect, loadControl } = require("./grounding-review-eval.cjs");

(async () => {
  const fixtureFile = path.join(__dirname, ".cdr/waves/memory-grounding-review-v1/fixture.jsonl");
  const goldFile = path.join(__dirname, ".cdr/waves/memory-grounding-review-v1/gold.jsonl");
  const control = loadControl(fixtureFile, goldFile);
  const model = "fake-grounding-review";
  const previous = process.env.CODEX_MODEL;
  process.env.CODEX_MODEL = model;
  let index = 0;
  const report = await collect({
    fixtureFile,
    goldFile,
    model,
    outputRoot: path.join(fs.mkdtempSync(path.join(os.tmpdir(), "pam-grounding-review-")), "report"),
    invoke: async () => {
      const fixture = control.fixture[index];
      const expected = control.gold[index++];
      const review = {
        schema_version: "memory-grounding-review-v1",
        candidate_sha256: fixture.candidate_sha256,
        reviews: expected.reviews.map(item => ({ ...item, evidence_span: fixture.source_text, reason: "Fixture verdict for deterministic collector verification" })),
      };
      return { output_text: JSON.stringify(review), usage: { input_tokens: 1, cached_input_tokens: 0, output_tokens: 1 }, stdout: "{}\n", stderr: "" };
    },
  });
  if (previous === undefined) delete process.env.CODEX_MODEL;
  else process.env.CODEX_MODEL = previous;
  assert.equal(index, 13);
  assert.equal(report.summary.verdict_accuracy.numerator, 16);
  assert.equal(report.summary.gate_accuracy.numerator, 13);
  assert.equal(report.summary.harmful_assertions_passed, 0);
  assert.equal(report.admission_writes, 0);
  console.log("grounding review eval ok: 13 bound candidates, 16 assertion labels, sealed fake collection");
})().catch(error => { console.error(error); process.exitCode = 1; });
