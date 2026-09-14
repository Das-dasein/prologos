#!/usr/bin/env node
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { verify } = require("./verify-report.cjs");

function choose(n, k) { let value = 1; for (let i = 1; i <= k; i += 1) value = value * (n - i + 1) / i; return value; }
function mcnemar(records, left, right, metric) {
  const a = new Map(records.filter(x => x.condition === left).map(x => [x.case_id, Boolean(x.score[metric])]));
  const b = new Map(records.filter(x => x.condition === right).map(x => [x.case_id, Boolean(x.score[metric])]));
  let improved = 0, worsened = 0, bothCorrect = 0, bothWrong = 0;
  for (const [id, first] of a) { const second = b.get(id); if (!first && second) improved += 1; else if (first && !second) worsened += 1; else if (first) bothCorrect += 1; else bothWrong += 1; }
  const discordant = improved + worsened; let p = 1;
  if (discordant) { let tail = 0; for (let k = 0; k <= Math.min(improved, worsened); k += 1) tail += choose(discordant, k); p = Math.min(1, 2 * tail / (2 ** discordant)); }
  return { left, right, metric, improved, worsened, both_correct: bothCorrect, both_wrong: bothWrong, exact_two_sided_p: p };
}
function count(rows, predicate) { return rows.filter(predicate).length; }
function analyze(report) {
  const records = report.records;
  const optional = records.filter(x => x.condition === "A"), selected = optional.filter(x => x.score.tool_called), skipped = optional.filter(x => !x.score.tool_called);
  const byStatus = Object.fromEntries(["entailed", "contradicted", "unknown", "conflict"].map(status => { const rows = optional.filter(x => x.stratum.status === status); return [status, { cases: rows.length, selected: count(rows, x => x.score.tool_called), exact: count(rows, x => x.score.exact) }]; }));
  const receiptRows = records.filter(x => ["A", "G"].includes(x.condition) && x.score.receipt_correct);
  return {
    schema_version: "autonomous-prolog-tool-analysis-v5",
    report_sha256: require("node:crypto").createHash("sha256").update(fs.readFileSync(report.__file)).digest("hex"),
    runtime_valid: count(records, x => x.score.runtime_valid),
    cells: records.length,
    per_condition: report.summary.per_condition,
    optional_selection: {
      selected: selected.length,
      skipped: skipped.length,
      selected_exact: count(selected, x => x.score.exact),
      skipped_exact: count(skipped, x => x.score.exact),
      selected_status_correct: count(selected, x => x.score.status_correct),
      skipped_status_correct: count(skipped, x => x.score.status_correct),
      two_call_pairs: count(selected, x => x.score.redundant_second_call),
      by_status: byStatus,
    },
    receipt_use: {
      correct_primary_receipts: receiptRows.length,
      final_status_correct: count(receiptRows, x => x.score.status_correct),
      final_support_membership_correct: count(receiptRows, x => x.score.support_set_correct),
      final_exact: count(receiptRows, x => x.score.exact),
      downstream_failures_after_correct_receipt: count(receiptRows, x => !x.score.exact),
    },
    paired_exact_mcnemar: ["status_correct", "support_set_correct", "exact"].flatMap(metric => [["N", "A"], ["N", "G"], ["A", "G"]].map(([left, right]) => mcnemar(records, left, right, metric))),
  };
}
async function main(directory) {
  await verify(directory);
  const file = path.join(path.resolve(directory), "report.json"), report = JSON.parse(fs.readFileSync(file)); report.__file = file;
  const result = analyze(report), output = path.join(path.dirname(file), "analysis.json"), bytes = `${JSON.stringify(result, null, 2)}\n`;
  if (fs.existsSync(output)) { if (fs.readFileSync(output, "utf8") !== bytes) throw new Error("existing analysis.json differs from deterministic replay"); }
  else fs.writeFileSync(output, bytes, { flag: "wx" });
  console.log(JSON.stringify({ output, ...result }, null, 2));
}
if (require.main === module) { if (!process.argv[2] || process.argv.length !== 3) process.exit(2); main(process.argv[2]).catch(error => { console.error(error.stack || error.message); process.exitCode = 1; }); }
module.exports = { analyze, mcnemar };
