#!/usr/bin/env node
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { verify } = require("./verify-report.cjs");
const CONDITIONS = ["L", "V", "S", "F"], METRICS = ["status_correct", "support_set_correct", "exact"];
function binomial(n, k) { let x = 1; for (let i = 1; i <= k; i += 1) x = x * (n - k + i) / i; return x; }
function mcnemar(cells) { const n = cells.left_only + cells.right_only; if (!n) return 1; const tail = Math.min(cells.left_only, cells.right_only); let p = 0; for (let k = 0; k <= tail; k += 1) p += binomial(n, k) * 0.5 ** n; return Math.min(1, 2 * p); }
function strata(records, condition, key) {
  const values = [...new Set(records.map(row => row.stratum[key]))];
  return Object.fromEntries(values.map(value => { const rows = records.filter(row => row.condition === condition && row.stratum[key] === value); return [value, { n: rows.length, status_correct: rows.filter(row => row.score.status_correct).length, exact: rows.filter(row => row.score.exact).length }]; }));
}
async function analyze(directory) {
  const verification = await verify(directory), report = JSON.parse(fs.readFileSync(path.join(path.resolve(directory), "report.json")));
  const paired = {};
  for (const [left, right] of [["L", "V"], ["L", "S"], ["L", "F"], ["V", "S"], ["V", "F"], ["S", "F"]]) for (const metric of METRICS) {
    const cells = { both_correct: 0, left_only: 0, right_only: 0, both_wrong: 0 };
    for (const item of report.selected_cases) {
      const l = report.records.find(row => row.case_id === item && row.condition === left).score[metric], r = report.records.find(row => row.case_id === item && row.condition === right).score[metric];
      cells[l && r ? "both_correct" : l ? "left_only" : r ? "right_only" : "both_wrong"] += 1;
    }
    paired[`${left}_${right}_${metric}`] = { ...cells, exact_two_sided_mcnemar_p: mcnemar(cells) };
  }
  const by_condition = {};
  for (const condition of CONDITIONS) by_condition[condition] = Object.fromEntries(["status", "depth", "topology", "revision_count"].map(key => [key, strata(report.records, condition, key)]));
  const errors = Object.fromEntries(CONDITIONS.map(condition => [condition, Object.fromEntries(METRICS.map(metric => [metric, report.records.filter(row => row.condition === condition && !row.score[metric]).map(row => row.case_id)]))]));
  return { schema_version: "temporal-receipt-ablation-analysis-v3", report_sha256: require("node:crypto").createHash("sha256").update(fs.readFileSync(path.join(path.resolve(directory), "report.json"))).digest("hex"), records: report.records.length, aggregate: verification.per_condition, paired, by_condition, errors };
}
if (require.main === module) { if (!process.argv[2] || process.argv.length > 4) process.exit(2); analyze(process.argv[2]).then(x => { const bytes = `${JSON.stringify(x, null, 2)}\n`; if (process.argv[3]) fs.writeFileSync(path.resolve(process.argv[3]), bytes, { flag: "wx" }); else process.stdout.write(bytes); }).catch(e => { console.error(e.stack || e.message); process.exitCode = 1; }); }
module.exports = { analyze, mcnemar };
