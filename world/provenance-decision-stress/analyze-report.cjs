#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { loadFrozenFixture } = require("./collector.cjs");
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
  const verified = await verify(reportDirectory);
  const frozen = await loadFrozenFixture();
  const reportFile = path.join(path.resolve(reportDirectory), "report.json");
  const reportBytes = fs.readFileSync(reportFile);
  const report = JSON.parse(reportBytes);
  const categories = {};
  for (const category of [...new Set(frozen.fixture.cases.map(item => item.stratum.category))]) {
    categories[category] = {};
    for (const condition of ["P0", "P1", "P2"]) {
      const rows = report.records.filter(record => record.stratum.category === category && record.condition === condition);
      categories[category][condition] = { cases: rows.length, decision_correct: rows.filter(row => row.score.decision_correct).length, support_correct: rows.filter(row => row.score.support_correct).length, exact: rows.filter(row => row.score.exact).length };
    }
  }
  const failures = report.records.filter(record => !record.score.exact).map(record => ({
    case_id: record.case_id,
    condition: record.condition,
    expected: frozen.fixture.cases.find(item => item.case_id === record.case_id).oracle,
    actual: { decision: record.score.decision, support: record.score.support },
    observed_failure: record.score.decision_correct && !record.score.support_correct && record.score.support?.includes("rules_")
      ? "rule_source_groups_included_instead_of_fact_groups_only"
      : !record.score.decision_correct && record.score.decision === "ask"
        ? "independent_pair_not_used_for_act"
        : "other_exact_mismatch",
  }));
  return {
    schema_version: "provenance-decision-stress-analysis-v1",
    status: "completed-posthoc-diagnostic",
    source_report_sha256: sha256(reportBytes),
    fixture_sha256: frozen.sha256,
    verified_status: verified.status,
    primary_metric: "exact decision plus canonical fact-source-group support",
    per_condition: verified.per_condition,
    paired: {
      p0_vs_p1: Object.fromEntries(["exact", "decision_correct", "support_correct"].map(metric => [metric, paired(report.records, frozen.fixture.cases, "P0", "P1", metric)])),
      p1_vs_p2: Object.fromEntries(["exact", "decision_correct", "support_correct"].map(metric => [metric, paired(report.records, frozen.fixture.cases, "P1", "P2", metric)])),
    },
    by_category: categories,
    failures,
    interpretation_boundary: "Primary exact improvement may be attributed only to exact proof-provenance output on this synthetic one-sample wave. Decision-only accuracy did not improve.",
  };
}

if (require.main === module) {
  const [reportDirectory, outputFile] = process.argv.slice(2);
  if (!reportDirectory || !outputFile || process.argv.length !== 4) { console.error("usage: node world/provenance-decision-stress/analyze-report.cjs REPORT_DIRECTORY NEW_OUTPUT.json"); process.exit(2); }
  analyze(reportDirectory).then(result => {
    const serialized = `${JSON.stringify(result, null, 2)}\n`;
    if (fs.existsSync(outputFile)) {
      if (fs.readFileSync(outputFile, "utf8") !== serialized) throw new Error("existing analysis differs");
    } else fs.writeFileSync(outputFile, serialized, { flag: "wx", mode: 0o600 });
    process.stdout.write(`${JSON.stringify({ status: result.status, source_report_sha256: result.source_report_sha256, p1_p2: result.paired.p1_vs_p2 })}\n`);
  }).catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
}

module.exports = { analyze, paired };
