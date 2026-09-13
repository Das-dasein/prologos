"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { canonicalJson } = require("./ontology-registry");
const { inspectExtractionCandidateV2 } = require("./extraction-admission");

const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const readFixture = file => fs.readFileSync(file, "utf8").trim().split(/\r?\n/).map(JSON.parse);

function replay(report, fixtureRows, inputReportSha256) {
  const sources = new Map(fixtureRows.map(row => [row.case_id, row.source_text]));
  const scores = new Map(report.scores.map(score => [score.case_id, score]));
  const records = report.records.map(record => {
    if (!sources.has(record.case_id) || !scores.has(record.case_id)) throw new Error("input case binding mismatch");
    const diagnostics = inspectExtractionCandidateV2(record.candidate, sources.get(record.case_id));
    return {
      case_id: record.case_id,
      semantic_exact: scores.get(record.case_id).semantic_exact,
      validator_v1_eligible: scores.get(record.case_id).admission_eligible,
      validator_v2_eligible: diagnostics.length === 0,
      validator_v2_diagnostics: diagnostics,
    };
  });
  const count = predicate => records.filter(predicate).length;
  return {
    schema_version: "product-extraction-validator-v2-replay-v1",
    status: "post-hoc-replay-not-generalization-evidence",
    input_report_sha256: inputReportSha256,
    input_candidate_count: records.length,
    provider_calls: 0,
    admission_writes: 0,
    summary: {
      validator_v1_eligible: count(row => row.validator_v1_eligible),
      validator_v2_eligible: count(row => row.validator_v2_eligible),
      semantic_errors_eligible_v1: count(row => !row.semantic_exact && row.validator_v1_eligible),
      semantic_errors_eligible_v2: count(row => !row.semantic_exact && row.validator_v2_eligible),
      semantic_exact_rejected_v2: count(row => row.semantic_exact && !row.validator_v2_eligible),
    },
    records,
  };
}

function verify(output, report, fixtureRows, inputReportSha256) {
  const expected = replay(report, fixtureRows, inputReportSha256);
  if (canonicalJson(output) !== canonicalJson(expected)) throw new Error("validator v2 replay mismatch");
  return { status: "verified-product-extraction-validator-v2-replay-v1", summary: output.summary };
}

function args(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    if (!["--report", "--fixture", "--output", "--verify"].includes(name) || !argv[index + 1]) throw new Error("invalid arguments");
    parsed[name.slice(2)] = argv[index + 1];
  }
  return parsed;
}

module.exports = { replay, verify };

if (require.main === module) {
  try {
    const options = args(process.argv.slice(2));
    if (!options.report || !options.fixture || (!options.output && !options.verify) || (options.output && options.verify)) throw new Error("provide report, fixture, and exactly one of output or verify");
    const reportFile = path.resolve(options.report);
    const reportText = fs.readFileSync(reportFile, "utf8");
    const report = JSON.parse(reportText);
    const fixture = readFixture(path.resolve(options.fixture));
    const digest = sha256(reportText);
    if (options.verify) {
      const output = JSON.parse(fs.readFileSync(path.resolve(options.verify), "utf8"));
      process.stdout.write(`${JSON.stringify(verify(output, report, fixture, digest))}\n`);
    } else {
      const outputFile = path.resolve(options.output);
      if (fs.existsSync(outputFile)) throw new Error("output already exists");
      const output = replay(report, fixture, digest);
      fs.mkdirSync(path.dirname(outputFile), { recursive: true });
      fs.writeFileSync(outputFile, `${JSON.stringify(output, null, 2)}\n`, { flag: "wx", mode: 0o600 });
      process.stdout.write(`${JSON.stringify({ status: output.status, summary: output.summary })}\n`);
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
