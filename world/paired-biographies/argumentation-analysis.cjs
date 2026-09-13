#!/usr/bin/env node
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const H = require("./harness.cjs");
const { check } = require("../checker");
const { compareSupportSets } = require("../agent");
const { opposite, buildArgumentGraph, analyzeDung } = require("../argumentation");

function acceptanceStatus(graph, ids, query) {
  const conclusions = new Map(graph.arguments.map(argument => [argument.id, argument.conclusion]));
  const positive = ids.some(id => conclusions.get(id) === query);
  const negative = ids.some(id => conclusions.get(id) === opposite(query));
  if (positive && negative) return "conflict";
  if (positive) return "entailed";
  if (negative) return "contradicted";
  return "unknown";
}
async function projectCase(c) {
  const items = c.accepted_memory.filter(item => c.expected_active_item_ids.includes(item.id));
  const checker = await check({ snapshot: { ideas: c.domain_projection, items }, query: c.query });
  if (checker.status !== "ok") throw new Error(`${c.case_id}: checker ${checker.status}`);
  if (checker.raw_status !== c.expected_raw_status || checker.safe_status !== c.expected_epistemic_status) throw new Error(`${c.case_id}: checker diverges from authored oracle`);
  const graph = buildArgumentGraph(checker), analysis = analyzeDung(graph);
  const grounded_status = acceptanceStatus(graph, analysis.grounded, c.query);
  const preferred_statuses = [...new Set(analysis.preferred.map(extension => acceptanceStatus(graph, extension, c.query)))].sort();
  return {
    case_id: c.case_id,
    pair_id: c.pair_id,
    variant: c.variant,
    query: c.query,
    raw_status: checker.raw_status,
    safe_status: checker.safe_status,
    support_comparison: compareSupportSets(checker, c.query, "raw"),
    support_attack: graph,
    dung: { ...analysis, grounded_status, preferred_statuses },
    comparison: {
      safe_equals_grounded: checker.safe_status === grounded_status,
      safe_equals_every_preferred: analysis.preferred.every(extension => acceptanceStatus(graph, extension, c.query) === checker.safe_status)
    }
  };
}
async function analyzeRows(rows) {
  const cases = [];
  for (const c of rows) cases.push(await projectCase(c));
  const divergences = cases.filter(c => !c.comparison.safe_equals_grounded || !c.comparison.safe_equals_every_preferred).map(c => c.case_id);
  return {
    cases,
    summary: {
      cases: cases.length,
      safe_equals_grounded: cases.filter(c => c.comparison.safe_equals_grounded).length,
      safe_equals_every_preferred: cases.filter(c => c.comparison.safe_equals_every_preferred).length,
      divergences
    }
  };
}
function outputPath(argv) {
  if (argv.length !== 2 || argv[0] !== "--out" || !argv[1]) throw new Error("Usage: argumentation-analysis.cjs --out NEW_REPORT.json");
  return path.resolve(argv[1]);
}
async function main() {
  const out = outputPath(process.argv.slice(2));
  if (fs.existsSync(out)) throw new Error("refusing to overwrite an argumentation receipt");
  const dataset = await H.loadDataset(), projected = await analyzeRows(dataset.rows);
  const receipt = {
    version: "paired-argumentation-projection-v1",
    status: "completed",
    boundary: "Read-only projection of authored active gold snapshots. It tests neither extraction, source truth, live model behavior nor an action policy.",
    dataset_sha256: dataset.dataset_sha256,
    schema_sha256: dataset.schema_sha256,
    source_sha256: {
      argumentation: H.sha(fs.readFileSync(path.join(__dirname, "../argumentation.js"))),
      analysis: H.sha(fs.readFileSync(__filename)),
      checker: H.sha(fs.readFileSync(path.join(__dirname, "../checker.pl")))
    },
    ...projected
  };
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(receipt, null, 2) + "\n");
  process.stdout.write(JSON.stringify({ out, status: receipt.status, ...receipt.summary }) + "\n");
}
if (require.main === module) main().catch(error => { process.stderr.write(error.stack + "\n"); process.exitCode = 1; });
module.exports = { acceptanceStatus, projectCase, analyzeRows };
