"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { ACTIVE_ONTOLOGY } = require("./ontology-registry");
const { collect, loadControl } = require("./product-extraction-v4-coref-control.cjs");

(async () => {
  const fixture = path.join(__dirname, ".cdr/waves/product-extraction-v4-coref-control-v1/fixture.jsonl");
  const gold = path.join(__dirname, ".cdr/waves/product-extraction-v4-coref-control-v1/gold.jsonl");
  const control = loadControl(fixture, gold);
  const model = "fake-v4-coref-control";
  const previous = process.env.CODEX_MODEL;
  process.env.CODEX_MODEL = model;
  let index = 0;
  const report = await collect({
    fixtureFile: fixture,
    goldFile: gold,
    model,
    outputRoot: path.join(fs.mkdtempSync(path.join(os.tmpdir(), "pam-v4-coref-")), "report"),
    invoke: async () => {
      const source = control.fixture[index];
      const expected = control.gold[index++];
      const candidate = {
        schema_version: "memory-extraction-v4",
        registry_identity: ACTIVE_ONTOLOGY.identity,
        decision: expected.expected_decision,
        assertions: expected.assertions.map(assertion => ({ ...assertion, confidence: 0.9, evidence_span: source.source_text })),
        ontology_candidates: expected.expected_decision === "ontology_candidate" ? [{
          name: "candidate_relation",
          arity: 1,
          argument_types: ["person"],
          meaning: "A durable relation not represented in the active registry",
          evidence_span: source.source_text,
        }] : [],
        clarification: expected.expected_decision === "clarify" ? { question: "Which person does the pronoun refer to?", evidence_span: source.source_text } : null,
      };
      return { output_text: JSON.stringify(candidate), usage: { input_tokens: 1, cached_input_tokens: 0, output_tokens: 1 }, stdout: "{}\n", stderr: "" };
    },
  });
  if (previous === undefined) delete process.env.CODEX_MODEL;
  else process.env.CODEX_MODEL = previous;
  assert.equal(index, 16);
  assert.equal(report.summary.decision_accuracy.numerator, 16);
  assert.equal(report.summary.semantic_case_exact.numerator, 16);
  assert.equal(report.admission_writes, 0);
  console.log("product extraction v4 coref control ok: frozen inputs, dual-validator scoring, and sealed fake collection");
})().catch(error => { console.error(error); process.exitCode = 1; });
