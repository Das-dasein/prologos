#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { loadFrozenFixture } = require("./collector.cjs");
const { verify } = require("./verify-report.cjs");

const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");

function parseContent(value) {
  if (typeof value !== "string") return null;
  const match = value.match(/^STATUS: (entailed|contradicted|unknown|conflict)\nSUPPORT: (none|[a-z][a-z0-9_]*(?:, ?[a-z][a-z0-9_]*)*)\n?$/);
  if (!match) return null;
  const support_item_ids = match[2] === "none" ? [] : match[2].split(",").map(id => id.trim());
  return { status: match[1], support_item_ids, sorted_support_item_ids: [...support_item_ids].sort(), canonical_order: support_item_ids.join(",") === [...support_item_ids].sort().join(",") };
}

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
  const cases = frozen.fixture.cases.filter(item => report.selected_cases.includes(item.case_id));
  const by_stratum = {};
  for (const dimension of ["depth", "topology", "locus", "transition"]) {
    by_stratum[dimension] = {};
    for (const value of [...new Set(cases.map(item => String(item.stratum[dimension])))]) {
      by_stratum[dimension][value] = {};
      for (const condition of report.selected_conditions) {
        const rows = report.records.filter(record => String(record.stratum[dimension]) === value && record.condition === condition);
        by_stratum[dimension][value][condition] = { cases: rows.length, status_correct: rows.filter(row => row.score.status_correct).length, support_correct: rows.filter(row => row.score.support_correct).length, exact: rows.filter(row => row.score.exact).length };
      }
    }
  }
  const semanticRecords = report.records.map(record => {
    const oracle = cases.find(item => item.case_id === record.case_id).oracle;
    const evidence = JSON.parse(fs.readFileSync(path.join(path.resolve(reportDirectory), record.evidence)));
    const parsed = parseContent(evidence.final_response);
    const expectedIds = [...oracle.support_item_ids].sort();
    const semanticStatus = record.score.runtime_valid && parsed?.status === oracle.status;
    const semanticSupport = record.score.runtime_valid && parsed && JSON.stringify(parsed.sorted_support_item_ids) === JSON.stringify(expectedIds);
    return { ...record, evidence, score: { ...record.score, semantic_status_correct: Boolean(semanticStatus), semantic_support_set_correct: Boolean(semanticSupport), semantic_exact: Boolean(semanticStatus && semanticSupport) }, parsed };
  });
  const semanticContent = {};
  for (const condition of report.selected_conditions) {
    const rows = semanticRecords.filter(record => record.condition === condition);
    semanticContent[condition] = {
      denominator: rows.length,
      runtime_valid: rows.filter(row => row.score.runtime_valid).length,
      content_valid: rows.filter(row => row.parsed).length,
      status_correct: rows.filter(row => row.score.semantic_status_correct).length,
      support_set_correct: rows.filter(row => row.score.semantic_support_set_correct).length,
      status_and_support_set_correct: rows.filter(row => row.score.semantic_exact).length,
      canonical_exact: rows.filter(row => row.score.exact).length,
    };
  }
  const failures = semanticRecords.filter(record => !record.score.exact).map(record => {
    const expected = cases.find(item => item.case_id === record.case_id).oracle;
    const providerParsed = parseContent(record.evidence.api_responses?.at(-1)?.output_text);
    const providerSetCorrect = providerParsed && JSON.stringify(providerParsed.sorted_support_item_ids) === JSON.stringify([...expected.support_item_ids].sort());
    let observed_failure = "other_exact_mismatch";
    if (!record.score.runtime_valid && providerParsed?.status === expected.status && providerSetCorrect) observed_failure = "post_response_adapter_failure_with_correct_provider_output";
    else if (record.score.semantic_exact && !record.parsed.canonical_order) observed_failure = "support_order_not_canonical";
    else if (record.score.semantic_status_correct && !record.score.semantic_support_set_correct) observed_failure = "support_set_mismatch";
    else if (!record.score.semantic_status_correct) observed_failure = "status_mismatch";
    return { case_id: record.case_id, condition: record.condition, expected, actual: record.parsed, observed_failure, provider_output_diagnostic: !record.score.runtime_valid ? { physical_dispatches: record.evidence.physical_dispatches, provider_terminal_status: record.evidence.provider_terminal_status, parsed_output: providerParsed } : null };
  });
  return {
    schema_version: "temporal-reasoning-stress-analysis-v1",
    status: "completed-posthoc-diagnostic",
    source_report_sha256: sha256(reportBytes),
    fixture_sha256: frozen.sha256,
    verified_status: verified.status,
    primary_metric: "exact status plus canonical active item support",
    per_condition: verified.per_condition,
    semantic_content_diagnostic: semanticContent,
    paired: {
      p0_vs_p1: Object.fromEntries(["exact", "status_correct", "support_correct"].map(metric => [metric, paired(report.records, cases, "P0", "P1", metric)])),
      p1_vs_p2: Object.fromEntries(["exact", "status_correct", "support_correct"].map(metric => [metric, paired(report.records, cases, "P1", "P2", metric)])),
      semantic_support_set_p0_vs_p1: paired(semanticRecords, cases, "P0", "P1", "semantic_exact"),
      semantic_support_set_p1_vs_p2: paired(semanticRecords, cases, "P1", "P2", "semantic_exact"),
    },
    by_stratum,
    failures,
    interpretation_boundary: "Any paired difference describes one model sample on synthetic gold event histories. It does not establish natural-language extraction fidelity, autonomous checker use, or general logical intelligence.",
  };
}

if (require.main === module) {
  const [reportDirectory, outputFile] = process.argv.slice(2);
  if (!reportDirectory || !outputFile || process.argv.length !== 4) { console.error("usage: node world/temporal-reasoning-stress/analyze-report.cjs REPORT_DIRECTORY NEW_OUTPUT.json"); process.exit(2); }
  analyze(reportDirectory).then(result => {
    const serialized = `${JSON.stringify(result, null, 2)}\n`;
    if (fs.existsSync(outputFile)) {
      if (fs.readFileSync(outputFile, "utf8") !== serialized) throw new Error("existing analysis differs");
    } else fs.writeFileSync(outputFile, serialized, { flag: "wx", mode: 0o600 });
    process.stdout.write(`${JSON.stringify({ status: result.status, source_report_sha256: result.source_report_sha256, p1_p2: result.paired.p1_vs_p2 })}\n`);
  }).catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
}

module.exports = { analyze, paired, parseContent };
