"use strict";
// Replays saved development candidates only. It never invokes a model.
const fs = require("node:fs");
const path = require("node:path");
const { runSemanticBranchDream } = require("./semantic-branch-dream");
const stable = value => JSON.stringify(value, null, 2) + "\n";

async function replay({ sampleFile, rawRoot, outputFile }) {
  const sample = JSON.parse(fs.readFileSync(sampleFile, "utf8"));
  const traces = [];
  for (const item of sample.cases) {
    const record = JSON.parse(fs.readFileSync(path.join(rawRoot, item.case_id, "record.json"), "utf8"));
    const baseline = record.formalization && record.formalization.output;
    const set = record.hypotheses && record.hypotheses.output;
    let trace = null;
    if (baseline && set) trace = await runSemanticBranchDream({ caseId: item.case_id, baseline, hypothesisSet: set, sourceSentences: item.world });
    traces.push({ case_id: item.case_id, source_id: item.source_id, conclusion: trace && trace.conclusion, trace });
  }
  const result = { schema_version: "semantic-branch-dream-fail-closed-replay-v1", status: "development-audit-not-cdr-receipt", model_calls: 0, source_raw_directory: rawRoot, traces };
  fs.writeFileSync(outputFile, stable(result), { flag: "wx", mode: 0o600 });
  return result;
}
if (require.main === module) {
  const [sampleFile, rawRoot, outputFile] = process.argv.slice(2);
  if (!sampleFile || !rawRoot || !outputFile) throw new Error("usage: sample.json raw-v8-dir replay.json");
  replay({ sampleFile, rawRoot, outputFile }).then(result => console.log(JSON.stringify({ model_calls: 0, conclusions: result.traces.map(row => [row.source_id, row.conclusion]) }))).catch(error => { console.error(error.stack || error); process.exitCode = 1; });
}
module.exports = { replay };
