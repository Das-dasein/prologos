#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { parseAnswer, loadFrozenFixture } = require("./collector.cjs");
const { verify } = require("./verify-report.cjs");

const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");

function paired(records, cases, left, right, metric) {
  const cells = { both_correct: 0, left_only: 0, right_only: 0, both_wrong: 0 };
  for (const item of cases) {
    const l = Boolean(records.find(record => record.case_id === item.case_id && record.condition === left).score[metric]);
    const r = Boolean(records.find(record => record.case_id === item.case_id && record.condition === right).score[metric]);
    cells[l && r ? "both_correct" : l ? "left_only" : r ? "right_only" : "both_wrong"] += 1;
  }
  const discordant = cells.left_only + cells.right_only;
  let tail = 0;
  if (discordant) {
    const extreme = Math.min(cells.left_only, cells.right_only);
    const choose = (n, k) => { let value = 1; for (let i = 1; i <= k; i += 1) value = value * (n - k + i) / i; return value; };
    for (let k = 0; k <= extreme; k += 1) tail += choose(discordant, k) * (0.5 ** discordant);
  }
  return { ...cells, discordant, exact_mcnemar_two_sided_p: discordant ? Math.min(1, 2 * tail) : 1 };
}

async function analyze(reportDirectory) {
  const verified = await verify(reportDirectory), frozen = await loadFrozenFixture();
  const root = path.resolve(reportDirectory), reportFile = path.join(root, "report.json"), reportBytes = fs.readFileSync(reportFile), report = JSON.parse(reportBytes);
  const cases = frozen.fixture.cases.filter(item => report.selected_cases.includes(item.case_id));
  const by_stratum = {};
  for (const dimension of ["depth", "topology", "revision_count", "status"]) {
    by_stratum[dimension] = {};
    for (const value of [...new Set(cases.map(item => String(item.stratum[dimension])))]) {
      by_stratum[dimension][value] = {};
      for (const condition of report.selected_conditions) {
        const rows = report.records.filter(record => String(record.stratum[dimension]) === value && record.condition === condition);
        by_stratum[dimension][value][condition] = { cases: rows.length, runtime_valid: rows.filter(row => row.score.runtime_valid).length, status_correct: rows.filter(row => row.score.status_correct).length, support_set_correct: rows.filter(row => row.score.support_set_correct).length, exact: rows.filter(row => row.score.exact).length };
      }
    }
  }
  const pairs = {};
  for (const [name, left, right] of [["p0_vs_p1", "P0", "P1"], ["p1_vs_p1f", "P1", "P1F"], ["p1_vs_p2", "P1", "P2"]].filter(([, left, right]) => report.selected_conditions.includes(left) && report.selected_conditions.includes(right))) {
    pairs[name] = Object.fromEntries(["status_correct", "support_set_correct", "exact"].map(metric => [metric, paired(report.records, cases, left, right, metric)]));
  }
  const failures = report.records.filter(record => !record.score.exact).map(record => {
    const evidence = JSON.parse(fs.readFileSync(path.join(root, record.evidence))), provider = parseAnswer(evidence.api_responses?.at(-1)?.output_text);
    const oracle = cases.find(item => item.case_id === record.case_id).oracle;
    let observed = !record.score.runtime_valid ? "runtime_failure" : !record.score.status_correct ? "status_mismatch" : !record.score.support_set_correct ? "support_set_mismatch" : !record.score.canonical_support ? "noncanonical_support" : "response_format_mismatch";
    if (!record.score.runtime_valid && provider.status === oracle.status) observed = "runtime_failure_with_correct_provider_status";
    return { case_id: record.case_id, condition: record.condition, expected_status: oracle.status, score: record.score, observed_failure: observed, provider_output_diagnostic: !record.score.runtime_valid ? { physical_dispatches: evidence.physical_dispatches, provider_terminal_status: evidence.provider_terminal_status, parsed_status: provider.status } : null };
  });
  return { schema_version: "temporal-relational-stress-analysis-v2", status: "completed-posthoc-diagnostic", source_report_sha256: sha256(reportBytes), fixture_sha256: frozen.sha256, verified_status: verified.status, primary_metric: "status accuracy independent of JSON and support serialization", per_condition: verified.per_condition, paired: pairs, by_stratum, failures, interpretation_boundary: "A paired P1-to-P2 status difference estimates checker-receipt utility only for this frozen synthetic one-sample wave. P1F diagnoses temporal projection separately." };
}

if (require.main === module) {
  const [reportDirectory, outputFile] = process.argv.slice(2);
  if (!reportDirectory || !outputFile || process.argv.length !== 4) { console.error("usage: node world/temporal-relational-stress/analyze-report.cjs REPORT_DIRECTORY NEW_OUTPUT.json"); process.exit(2); }
  analyze(reportDirectory).then(result => {
    const serialized = `${JSON.stringify(result, null, 2)}\n`;
    if (fs.existsSync(outputFile)) { if (fs.readFileSync(outputFile, "utf8") !== serialized) throw new Error("existing analysis differs"); }
    else fs.writeFileSync(outputFile, serialized, { flag: "wx", mode: 0o600 });
    process.stdout.write(`${JSON.stringify({ status: result.status, source_report_sha256: result.source_report_sha256, p1_p2: result.paired.p1_vs_p2 || null })}\n`);
  }).catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
}

module.exports = { analyze, paired };
