"use strict";
// Re-executes saved v2 candidates only. It makes zero model calls.
const fs = require("node:fs");
const path = require("node:path");
const { runSemanticBranchDream } = require("./semantic-branch-dream");
const { asV1 } = require("./semantic-branch-dream-v2-run");
const stable = value => JSON.stringify(value, null, 2) + "\n";
async function replay({ sampleFile, rawRoot, outputFile }) {
  const sample = JSON.parse(fs.readFileSync(sampleFile, "utf8"));
  const rows = [];
  for (const item of sample.cases) {
    const record = JSON.parse(fs.readFileSync(path.join(rawRoot, item.case_id, "record.json"), "utf8"));
    const baseline = record.formalization.output;
    const condition = async receipt => receipt && receipt.output ? runSemanticBranchDream({ caseId: item.case_id, baseline, hypothesisSet: asV1(receipt.output), sourceSentences: item.world }) : { conclusion: "transport_error" };
    rows.push({ case_id: item.case_id, expected_class: item.expected_class, plain: await condition(record.plain), declared: await condition(record.declared), assessment: record.declared.output.assessment });
  }
  const result = { schema_version: "semantic-branch-dream-v2-fail-closed-replay-v1", status: "development-audit-not-cdr-receipt", model_calls: 0, rows };
  fs.writeFileSync(outputFile, stable(result), { flag: "wx", mode: 0o600 }); return result;
}
if (require.main === module) { const [sampleFile, rawRoot, outputFile] = process.argv.slice(2); replay({ sampleFile, rawRoot, outputFile }).then(result => console.log(JSON.stringify({ model_calls: 0, rows: result.rows.map(row => [row.case_id, row.plain.conclusion, row.declared.conclusion]) }))).catch(error => { console.error(error.stack || error); process.exitCode = 1; }); }
module.exports = { replay };
