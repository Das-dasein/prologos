"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { ACTIVE_ONTOLOGY } = require("./ontology-registry");
const { collect, loadControl } = require("./extraction-grounding-e2e.cjs");

(async () => {
  const fixtureFile = path.join(__dirname, ".cdr/waves/extraction-grounding-e2e-v1/fixture.jsonl");
  const goldFile = path.join(__dirname, ".cdr/waves/extraction-grounding-e2e-v1/gold.jsonl");
  const control = loadControl(fixtureFile, goldFile);
  const model = "fake-extraction-grounding-e2e";
  const previous = process.env.CODEX_MODEL;
  process.env.CODEX_MODEL = model;
  let extractionIndex = 0;
  let active = null;
  const report = await collect({
    fixtureFile,
    goldFile,
    model,
    outputRoot: path.join(fs.mkdtempSync(path.join(os.tmpdir(), "pam-extraction-grounding-")), "report"),
    invoke: async (_prompt, options) => {
      let output;
      if (options.schema.endsWith("memory-extraction-v4.schema.json")) {
        const fixture = control.fixture[extractionIndex];
        const expected = control.gold[extractionIndex++];
        output = {
          schema_version: "memory-extraction-v4",
          registry_identity: ACTIVE_ONTOLOGY.identity,
          decision: expected.expected_decision,
          assertions: expected.assertions.map(assertion => ({ ...assertion, confidence: 0.9, evidence_span: fixture.source_text })),
          ontology_candidates: expected.expected_decision === "ontology_candidate" ? [{ name: "candidate_relation", arity: 1, argument_types: ["person"], meaning: "A durable unregistered relation", evidence_span: fixture.source_text }] : [],
          clarification: expected.expected_decision === "clarify" ? { question: "Which person is intended?", evidence_span: fixture.source_text } : null,
        };
        active = { fixture, candidate: output };
      } else {
        output = {
          schema_version: "memory-grounding-review-v1",
          candidate_sha256: require("./grounding-review").sha256(require("./ontology-registry").canonicalJson(active.candidate)),
          reviews: active.candidate.assertions.map((_, assertionIndex) => ({ assertion_index: assertionIndex, verdict: "entailed", evidence_span: active.fixture.source_text, reason: "Deterministic fake review" })),
        };
      }
      return { output_text: JSON.stringify(output), usage: { input_tokens: 1, cached_input_tokens: 0, output_tokens: 1 }, stdout: "{}\n", stderr: "" };
    },
  });
  if (previous === undefined) delete process.env.CODEX_MODEL;
  else process.env.CODEX_MODEL = previous;
  assert.equal(extractionIndex, 12);
  assert.equal(report.review_calls, 6);
  assert.equal(report.provider_calls, 18);
  assert.equal(report.summary.extraction_semantic_exact.numerator, 12);
  assert.equal(report.summary.final_hybrid_accuracy.numerator, 12);
  assert.equal(report.summary.harmful_writes.hybrid, 0);
  assert.equal(report.admission_writes, 0);
  console.log("extraction-grounding e2e ok: frozen two-stage control, 18 fake calls, zero writes");
})().catch(error => { console.error(error); process.exitCode = 1; });
