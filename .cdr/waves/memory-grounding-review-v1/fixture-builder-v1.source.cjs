"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { canonicalJson } = require("./ontology-registry");

const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const readJsonl = file => fs.readFileSync(file, "utf8").trim().split(/\r?\n/).map(JSON.parse);
const projection = assertion => ({ polarity: assertion.polarity, relation: assertion.relation, arguments: assertion.arguments, valid_from: assertion.valid_from, valid_to: assertion.valid_to });

function sourceSet(reportFile, fixtureFile, goldFile, selectedIds = null) {
  const reportBytes = fs.readFileSync(reportFile);
  const report = JSON.parse(reportBytes);
  const fixtures = new Map(readJsonl(fixtureFile).map(row => [row.case_id, row]));
  const gold = new Map(readJsonl(goldFile).map(row => [row.case_id, row]));
  return report.records.filter(record => record.candidate.assertions.length && (!selectedIds || selectedIds.has(record.case_id))).map(record => ({
    source_report: path.relative(process.cwd(), reportFile),
    source_report_sha256: sha256(reportBytes),
    source_case_id: record.case_id,
    source_text: fixtures.get(record.case_id).source_text,
    candidate: record.candidate,
    candidate_sha256: record.candidate_sha256,
    expected: gold.get(record.case_id),
  }));
}

function build() {
  const sources = [
    ...sourceSet("reports/product-extraction-v4-eval-v1/luna/report.json", ".cdr/waves/product-extraction-v4-eval-v1/fixture.jsonl", ".cdr/waves/product-extraction-v4-eval-v1/gold.jsonl"),
    ...sourceSet("reports/product-extraction-v4-coref-control-v1/luna/report.json", ".cdr/waves/product-extraction-v4-coref-control-v1/fixture.jsonl", ".cdr/waves/product-extraction-v4-coref-control-v1/gold.jsonl"),
    ...sourceSet("reports/product-extraction-validator-v2-control-v1/luna/report.json", ".cdr/waves/product-extraction-validator-v2-control-v1/fixture.jsonl", ".cdr/waves/product-extraction-validator-v2-control-v1/gold.jsonl", new Set(["coref-03", "coref-06"])),
  ];
  const fixtures = [];
  const gold = [];
  sources.forEach((source, index) => {
    const caseId = `gr-${String(index + 1).padStart(2, "0")}`;
    const expectedKeys = new Set(source.expected.assertions.map(assertion => canonicalJson(projection(assertion))));
    const expectedDecision = source.expected.expected_decision || source.expected.expected_action;
    fixtures.push({
      case_id: caseId,
      source_report: source.source_report,
      source_report_sha256: source.source_report_sha256,
      source_case_id: source.source_case_id,
      source_text: source.source_text,
      candidate_sha256: source.candidate_sha256,
      candidate: source.candidate,
    });
    gold.push({
      case_id: caseId,
      reviews: source.candidate.assertions.map((assertion, assertionIndex) => ({
        assertion_index: assertionIndex,
        verdict: expectedKeys.has(canonicalJson(projection(assertion))) ? "entailed" : expectedDecision === "clarify" ? "uncertain" : "not_entailed",
      })),
    });
  });
  return { fixtures, gold };
}

if (require.main === module) {
  const [fixtureArg, goldArg] = process.argv.slice(2);
  if (!fixtureArg || !goldArg) throw new Error("usage: node build-grounding-review-fixture.cjs FIXTURE GOLD");
  const { fixtures, gold } = build();
  fs.mkdirSync(path.dirname(fixtureArg), { recursive: true });
  fs.writeFileSync(fixtureArg, `${fixtures.map(canonicalJson).join("\n")}\n`, { flag: "wx" });
  fs.writeFileSync(goldArg, `${gold.map(canonicalJson).join("\n")}\n`, { flag: "wx" });
  process.stdout.write(`${JSON.stringify({ cases: fixtures.length, assertions: gold.reduce((sum, row) => sum + row.reviews.length, 0) })}\n`);
}

module.exports = { build };
