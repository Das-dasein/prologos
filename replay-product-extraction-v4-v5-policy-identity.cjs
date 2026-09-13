"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { canonicalJson } = require("./ontology-registry");
const { ACTIVE_GROUNDING_POLICY } = require("./predicate-grounding-policy");
const { EXTRACTION_ADMISSION_POLICY_V1 } = require("./extraction-admission-policy");
const { inspectExtractionCandidateV2PolicyIdentity } = require("./extraction-admission");
const { loadControl, verifyReport } = require("./product-extraction-v4-v5-paired-eval.cjs");

const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const asV4 = candidate => {
  if (candidate.schema_version === "memory-extraction-v4") return candidate;
  const { policy_identity: ignored, ...rest } = candidate;
  return { ...rest, schema_version: "memory-extraction-v4" };
};

function replay(reportFile, fixtureFile, goldFile) {
  const reportBytes = fs.readFileSync(reportFile);
  const report = JSON.parse(reportBytes);
  const control = loadControl(fixtureFile, goldFile);
  verifyReport(report, control);
  const records = report.records.map(record => {
    const source = control.fixture.find(row => row.case_id === record.case_id);
    const score = report.scores.find(row => row.case_id === record.case_id && row.condition === record.condition);
    const diagnostics = inspectExtractionCandidateV2PolicyIdentity(asV4(record.candidate), source.source_text, EXTRACTION_ADMISSION_POLICY_V1);
    return {
      case_id: record.case_id,
      condition: record.condition,
      actual_write: record.candidate.decision === "write",
      semantic_exact: score.semantic_exact,
      policy_identity_eligible: diagnostics.length === 0,
      diagnostics,
      harmful_write_eligible: record.candidate.decision === "write" && !score.semantic_exact && diagnostics.length === 0,
      correct_write_blocked: record.candidate.decision === "write" && score.semantic_exact && diagnostics.length > 0,
    };
  });
  const byCondition = condition => {
    const rows = records.filter(row => row.condition === condition);
    return {
      writes: rows.filter(row => row.actual_write).length,
      policy_identity_eligible_writes: rows.filter(row => row.actual_write && row.policy_identity_eligible).length,
      harmful_writes_eligible: rows.filter(row => row.harmful_write_eligible).length,
      correct_writes_blocked: rows.filter(row => row.correct_write_blocked).length,
      blocked_case_ids: rows.filter(row => row.actual_write && !row.policy_identity_eligible).map(row => row.case_id),
    };
  };
  return {
    schema_version: "product-extraction-v4-v5-policy-identity-replay-v4",
    status: "post-hoc-validator-authored-after-live-wave",
    source_report_sha256: sha256(reportBytes),
    policy_identity: ACTIVE_GROUNDING_POLICY.identity,
    admission_policy_identity: EXTRACTION_ADMISSION_POLICY_V1.identity,
    validator_source_sha256: sha256(fs.readFileSync(path.join(__dirname, "extraction-admission.js"))),
    identity_argument_types: ["person", "organization", "place", "technology", "project"],
    admission_writes: 0,
    records,
    summary: { v4: byCondition("v4"), v5: byCondition("v5") },
  };
}

if (require.main === module) {
  const [reportArg, fixtureArg, goldArg, outputArg] = process.argv.slice(2);
  if (!reportArg || !fixtureArg || !goldArg || !outputArg) throw new Error("usage: node replay-product-extraction-v4-v5-policy-identity.cjs REPORT FIXTURE GOLD OUTPUT");
  const output = replay(path.resolve(reportArg), path.resolve(fixtureArg), path.resolve(goldArg));
  const outputFile = path.resolve(outputArg);
  const serialized = `${JSON.stringify(output, null, 2)}\n`;
  if (fs.existsSync(outputFile)) {
    if (fs.readFileSync(outputFile, "utf8") !== serialized) throw new Error("existing policy identity replay differs");
  } else {
    fs.mkdirSync(path.dirname(outputFile), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputFile, serialized, { flag: "wx", mode: 0o600 });
  }
  process.stdout.write(`${JSON.stringify({ status: output.status, summary: output.summary })}\n`);
}

module.exports = { replay };
