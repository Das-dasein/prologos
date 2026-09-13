"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { ACTIVE_ONTOLOGY } = require("./ontology-registry");
const { collect, loadControl, scoreCase, verifyReport } = require("./product-extraction-v3-control.cjs");

const fixtureFile = path.join(__dirname, ".cdr/waves/product-extraction-validator-v2-control-v1/fixture.jsonl");
const goldFile = path.join(__dirname, ".cdr/waves/product-extraction-validator-v2-control-v1/gold.jsonl");
const control = loadControl(fixtureFile, goldFile);
let call = 0;

const invoke = async () => {
  const source = control.fixture[call];
  const gold = control.gold[call++];
  const candidate = {
    schema_version: "memory-extraction-v3",
    registry_identity: ACTIVE_ONTOLOGY.identity,
    assertions: gold.assertions.map(assertion => ({ ...assertion, confidence: 1, evidence_span: source.source_text })),
    ontology_candidates: [],
  };
  return { output_text: JSON.stringify(candidate), usage: { input_tokens: 10, cached_input_tokens: 0, output_tokens: 5 }, stdout: `${JSON.stringify({ type: "item.completed" })}\n`, stderr: "" };
};

(async () => {
  const previous = process.env.CODEX_MODEL;
  process.env.CODEX_MODEL = "fake-control-model";
  const outputRoot = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "pam-v3-control-")), "run");
  const report = await collect({ fixtureFile, goldFile, model: "fake-control-model", outputRoot, invoke });
  if (previous === undefined) delete process.env.CODEX_MODEL;
  else process.env.CODEX_MODEL = previous;
  assert.equal(call, 12);
  assert.equal(report.summary.semantic_case_exact.rate, 1);
  assert.equal(report.summary.harmful_writes_eligible, 0);
  assert.equal(report.summary.correct_writes_blocked, 0);
  assert.equal(verifyReport(report, control).status, "verified-product-extraction-v3-validator-control-v1");

  const ambiguous = control.fixture.find(row => row.case_id === "coref-03");
  const expected = control.gold.find(row => row.case_id === "coref-03");
  const fullSpanWrong = { schema_version: "memory-extraction-v3", registry_identity: ACTIVE_ONTOLOGY.identity, assertions: [{ polarity: "positive", relation: "uses", arguments: ["alex", "python"], valid_from: null, valid_to: null, confidence: 1, evidence_span: ambiguous.source_text }], ontology_candidates: [] };
  const score = scoreCase(ambiguous, expected, fullSpanWrong);
  assert.equal(score.semantic_exact, false);
  assert.equal(score.validator_v2_eligible, true, "v2 is intentionally known not to prove full-span coreference");
  assert.equal(score.harmful_write_eligible, true);
  console.log("product extraction v3 control ok: frozen inputs, fake collection, replay, and known v2 limit");
})().catch(error => { console.error(error); process.exitCode = 1; });
