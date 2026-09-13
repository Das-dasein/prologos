"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { canonicalJson } = require("./ontology-registry");
const { inspectExtractionCandidateV3 } = require("./extraction-admission");

const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const readJsonl = file => fs.readFileSync(file, "utf8").trim().split(/\r?\n/).map(JSON.parse);

const assertionProjection = assertion => ({
  polarity: assertion.polarity,
  relation: assertion.relation,
  arguments: assertion.arguments,
  valid_from: assertion.valid_from,
  valid_to: assertion.valid_to,
});
const assertionKeys = assertions => assertions.map(assertion => canonicalJson(assertionProjection(assertion))).sort();

function replay(report, fixture, gold, bindings) {
  const sourceById = new Map(fixture.map(row => [row.case_id, row.source_text]));
  const goldById = new Map(gold.map(row => [row.case_id, row]));
  const scoreById = new Map(report.scores.map(row => [row.case_id, row]));
  const records = report.records.map(record => {
    const sourceText = sourceById.get(record.case_id);
    const prior = scoreById.get(record.case_id);
    const expected = goldById.get(record.case_id);
    if (typeof sourceText !== "string" || !prior || !expected) throw new Error(`missing replay binding for ${record.case_id}`);
    const diagnostics = inspectExtractionCandidateV3(record.candidate, sourceText);
    const expectedWrite = (prior.expected_decision || prior.expected_action) === "write";
    const actualWrite = record.candidate.assertions.length > 0;
    const assertionExact = canonicalJson(assertionKeys(record.candidate.assertions)) === canonicalJson(assertionKeys(expected.assertions));
    return {
      case_id: record.case_id,
      candidate_sha256: record.candidate_sha256,
      validator_v3_eligible: diagnostics.length === 0,
      validator_v3_diagnostics: diagnostics,
      assertion_exact: assertionExact,
      correct_write_blocked: expectedWrite && assertionExact && diagnostics.length > 0,
      harmful_write_eligible: actualWrite && !assertionExact && diagnostics.length === 0,
    };
  });
  return {
    schema_version: "product-extraction-validator-v3-replay-v1",
    status: "post-hoc-diagnostic-only",
    source_report_sha256: bindings.report_sha256,
    fixture_sha256: bindings.fixture_sha256,
    gold_sha256: bindings.gold_sha256,
    validator_source_sha256: bindings.validator_source_sha256,
    cases: records.length,
    validator_v3_eligible: records.filter(row => row.validator_v3_eligible).length,
    correct_writes_blocked: records.filter(row => row.correct_write_blocked).length,
    harmful_writes_eligible: records.filter(row => row.harmful_write_eligible).length,
    changed_cases: records.filter(row => {
      const prior = scoreById.get(row.case_id);
      return Boolean(prior.validator_v2_eligible) !== row.validator_v3_eligible;
    }),
    records,
  };
}

function main(argv) {
  const [reportArg, fixtureArg, goldArg, outputArg] = argv;
  if (!reportArg || !fixtureArg || !goldArg || !outputArg) throw new Error("usage: node product-extraction-validator-v3-replay.cjs REPORT FIXTURE GOLD OUTPUT");
  const reportFile = path.resolve(reportArg);
  const fixtureFile = path.resolve(fixtureArg);
  const goldFile = path.resolve(goldArg);
  const outputFile = path.resolve(outputArg);
  const report = JSON.parse(fs.readFileSync(reportFile, "utf8"));
  const fixture = readJsonl(fixtureFile);
  const gold = readJsonl(goldFile);
  const bindings = {
    report_sha256: sha256(fs.readFileSync(reportFile)),
    fixture_sha256: sha256(fs.readFileSync(fixtureFile)),
    gold_sha256: sha256(fs.readFileSync(goldFile)),
    validator_source_sha256: sha256(fs.readFileSync(path.resolve("extraction-admission.js"))),
  };
  const result = replay(report, fixture, gold, bindings);
  if (fs.existsSync(outputFile)) {
    const existing = JSON.parse(fs.readFileSync(outputFile, "utf8"));
    if (canonicalJson(existing) !== canonicalJson(result)) throw new Error("stored replay differs from current replay");
  } else {
    fs.mkdirSync(path.dirname(outputFile), { recursive: true });
    fs.writeFileSync(outputFile, `${JSON.stringify(result, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  }
  process.stdout.write(`${JSON.stringify({ status: result.status, cases: result.cases, eligible: result.validator_v3_eligible, correct_writes_blocked: result.correct_writes_blocked, harmful_writes_eligible: result.harmful_writes_eligible, changed_cases: result.changed_cases.map(row => row.case_id) })}\n`);
}

module.exports = { replay };
if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
