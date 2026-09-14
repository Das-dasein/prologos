#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { verify } = require("./verify-report.cjs");

function choose(n, k) {
  let value = 1;
  for (let i = 1; i <= k; i += 1) value = value * (n - i + 1) / i;
  return value;
}

function mcnemar(records, left, right, metric) {
  const firstByCase = new Map(
    records.filter(record => record.condition === left)
      .map(record => [record.case_id, Boolean(record.score[metric])]),
  );
  const secondByCase = new Map(
    records.filter(record => record.condition === right)
      .map(record => [record.case_id, Boolean(record.score[metric])]),
  );
  let improved = 0;
  let worsened = 0;
  let bothCorrect = 0;
  let bothWrong = 0;
  for (const [caseId, first] of firstByCase) {
    const second = secondByCase.get(caseId);
    if (!first && second) improved += 1;
    else if (first && !second) worsened += 1;
    else if (first) bothCorrect += 1;
    else bothWrong += 1;
  }
  const discordant = improved + worsened;
  let p = 1;
  if (discordant) {
    let tail = 0;
    for (let k = 0; k <= Math.min(improved, worsened); k += 1) {
      tail += choose(discordant, k);
    }
    p = Math.min(1, 2 * tail / (2 ** discordant));
  }
  return {
    left,
    right,
    metric,
    improved,
    worsened,
    both_correct: bothCorrect,
    both_wrong: bothWrong,
    exact_two_sided_p: p,
  };
}

function count(rows, predicate) {
  return rows.filter(predicate).length;
}

function summarizeBytes(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    count: sorted.length,
    min: sorted[0],
    max: sorted.at(-1),
    mean: sorted.reduce((sum, value) => sum + value, 0) / sorted.length,
  };
}

function summarizeUsage(records, condition) {
  const rows = records.filter(record => record.condition === condition);
  const totals = rows.map(record => record.usage.responses.reduce((sum, response) => ({
    input_tokens: sum.input_tokens + response.input_tokens,
    output_tokens: sum.output_tokens + response.output_tokens,
    total_tokens: sum.total_tokens + response.total_tokens,
  }), { input_tokens: 0, output_tokens: 0, total_tokens: 0 }));
  const inputTokens = totals.reduce((sum, value) => sum + value.input_tokens, 0);
  const outputTokens = totals.reduce((sum, value) => sum + value.output_tokens, 0);
  const totalTokens = totals.reduce((sum, value) => sum + value.total_tokens, 0);
  return {
    cells: rows.length,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: totalTokens,
    mean_total_tokens_per_cell: totalTokens / rows.length,
  };
}

function analyze(report, directory) {
  const records = report.records;
  const statuses = ["entailed", "contradicted", "unknown", "conflict"];
  const byStatus = Object.fromEntries(statuses.map(status => {
    const rows = records.filter(record => record.stratum.status === status);
    return [status, Object.fromEntries(["R", "C"].map(condition => {
      const conditionRows = rows.filter(record => record.condition === condition);
      return [condition, {
        cases: conditionRows.length,
        status_correct: count(conditionRows, record => record.score.status_correct),
        support_set_correct: count(conditionRows, record => record.score.support_set_correct),
        exact: count(conditionRows, record => record.score.exact),
      }];
    }))];
  }));

  const deliveredBytes = { R: [], C: [] };
  const rawBytes = [];
  for (const record of records) {
    const evidence = JSON.parse(fs.readFileSync(path.join(directory, record.evidence), "utf8"));
    const toolCall = evidence.tool_calls[0];
    rawBytes.push(Buffer.byteLength(toolCall.raw_result, "utf8"));
    deliveredBytes[record.condition].push(Buffer.byteLength(toolCall.delivered_result, "utf8"));
  }

  return {
    schema_version: "prolog-receipt-transport-analysis-v6",
    report_sha256: crypto.createHash("sha256")
      .update(fs.readFileSync(path.join(directory, "report.json")))
      .digest("hex"),
    cells: records.length,
    runtime_valid: count(records, record => record.score.runtime_valid),
    per_condition: report.summary.per_condition,
    by_status: byStatus,
    receipt_bytes: {
      raw_checker_result: summarizeBytes(rawBytes),
      delivered_raw_R: summarizeBytes(deliveredBytes.R),
      delivered_compact_C: summarizeBytes(deliveredBytes.C),
    },
    model_usage: {
      R: summarizeUsage(records, "R"),
      C: summarizeUsage(records, "C"),
    },
    paired_exact_mcnemar: ["status_correct", "support_set_correct", "exact"]
      .map(metric => mcnemar(records, "R", "C", metric)),
    compact_exact_failures: records
      .filter(record => record.condition === "C" && !record.score.exact)
      .map(record => record.case_id),
    raw_exact_failures: records
      .filter(record => record.condition === "R" && !record.score.exact)
      .map(record => record.case_id),
  };
}

async function main(directoryArgument) {
  await verify(directoryArgument);
  const directory = path.resolve(directoryArgument);
  const report = JSON.parse(fs.readFileSync(path.join(directory, "report.json"), "utf8"));
  const result = analyze(report, directory);
  const output = path.join(directory, "analysis.json");
  const bytes = `${JSON.stringify(result, null, 2)}\n`;
  if (fs.existsSync(output)) {
    if (fs.readFileSync(output, "utf8") !== bytes) {
      throw new Error("existing analysis.json differs from deterministic replay");
    }
  } else {
    fs.writeFileSync(output, bytes, { flag: "wx" });
  }
  console.log(JSON.stringify({ output, ...result }, null, 2));
}

if (require.main === module) {
  if (!process.argv[2] || process.argv.length !== 3) process.exit(2);
  main(process.argv[2]).catch(error => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}

module.exports = { analyze, mcnemar };
