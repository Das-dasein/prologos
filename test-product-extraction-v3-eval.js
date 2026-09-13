"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { ACTIVE_ONTOLOGY } = require("./ontology-registry");
const { collect, goldAssertion, loadFixture, scoreCase, verifyReport } = require("./product-extraction-v3-eval.cjs");

const fixtureFile = path.join(__dirname, ".cdr/waves/product-extraction-v3-eval-v1/fixture.jsonl");
const goldFile = path.join(__dirname, ".cdr/datasets/extraction-annotation-pilot-v1.jsonl");
const goldRows = fs.readFileSync(goldFile, "utf8").trim().split(/\r?\n/).map(JSON.parse);
const fixture = loadFixture(fixtureFile);
let call = 0;

const invoke = async () => {
  const gold = goldRows[call++];
  const candidate = {
    schema_version: "memory-extraction-v3",
    registry_identity: ACTIVE_ONTOLOGY.identity,
    assertions: gold.assertions.map(item => {
      const mapped = goldAssertion(item);
      return {
        polarity: mapped.polarity,
        relation: mapped.relation,
        arguments: mapped.arguments,
        valid_from: mapped.valid_from,
        valid_to: mapped.valid_to,
        confidence: 0.99,
        evidence_span: mapped.source_span,
      };
    }),
    ontology_candidates: [],
  };
  return {
    output_text: JSON.stringify(candidate),
    usage: { input_tokens: 10, cached_input_tokens: 0, output_tokens: 5 },
    stdout: `${JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: JSON.stringify(candidate) } })}\n`,
    stderr: "",
  };
};

(async () => {
  const oldModel = process.env.CODEX_MODEL;
  process.env.CODEX_MODEL = "fake-v3-model";
  const outputRoot = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "pam-v3-eval-")), "run");
  const report = await collect({ fixtureFile, goldFile, model: "fake-v3-model", outputRoot, invoke });
  if (oldModel === undefined) delete process.env.CODEX_MODEL;
  else process.env.CODEX_MODEL = oldModel;

  assert.equal(call, 9);
  assert.equal(report.provider_calls, 9);
  assert.equal(report.admission_writes, 0);
  for (const metric of ["write_boundary_accuracy", "semantic_case_exact", "admission_eligible", "assertion_precision", "assertion_recall", "strict_evidence_exact", "relaxed_evidence_overlap"])
    assert.equal(report.summary[metric].rate, 1, metric);
  assert.equal(report.summary.ontology_candidates, 0);
  assert.equal(fs.existsSync(path.join(outputRoot, "raw", "extract-01", "stdout.jsonl")), true);
  assert.equal(fs.statSync(path.join(outputRoot, "report.json")).mode & 0o777, 0o600);
  assert.equal(verifyReport(report, fixture.rows, goldRows).status, "verified-product-extraction-v3-eval-v1");

  const falsePositive = JSON.parse(JSON.stringify(report.records.find(item => item.case_id === "extract-05").candidate));
  falsePositive.assertions.push({ polarity: "positive", relation: "works_at", arguments: ["user", "acme"], valid_from: null, valid_to: null, confidence: 1, evidence_span: "work at Acme" });
  const scored = scoreCase(fixture.rows.find(item => item.case_id === "extract-05"), goldRows.find(item => item.case_id === "extract-05"), falsePositive);
  assert.equal(scored.write_boundary_correct, false);
  assert.equal(scored.semantic_exact, false);
  assert.equal(scored.admission_eligible, true, "textual grounding alone must not be mislabeled semantic correctness");

  console.log("product extraction v3 eval ok: sealed fake collection, replay scoring, and grounding boundary");
})().catch(error => { console.error(error); process.exitCode = 1; });
