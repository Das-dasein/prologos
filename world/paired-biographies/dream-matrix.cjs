#!/usr/bin/env node
"use strict";

// Small counterbalanced live comparison for the pre-authored dream-eligible
// rows. It evaluates only observable JSON decisions, never hidden reasoning.
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const H = require("./harness.cjs");
const { invoke } = require("./run.cjs");

function write(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n"); }
function options(argv) {
  const opts = { repetitions: 2, model: "gpt-5.6-luna", out: null };
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index], value = argv[index + 1];
    if (!value || !["--repetitions", "--model", "--out"].includes(key)) throw new Error("Usage: dream-matrix.cjs --repetitions POSITIVE_EVEN_INT --model MODEL --out NEW_DIRECTORY");
    opts[key.slice(2)] = value;
  }
  opts.repetitions = Number(opts.repetitions);
  if (!Number.isSafeInteger(opts.repetitions) || opts.repetitions < 2 || opts.repetitions % 2 || !opts.out) throw new Error("repetitions must be a positive even integer >= 2 and --out is required");
  return opts;
}
function cells(rows, repetitions) {
  const eligible = rows.filter(row => row.dream_eligibility.eligible);
  const result = [];
  for (let repetition = 0; repetition < repetitions; repetition++) {
    const order = repetition % 2 === 0 ? ["checked_prolog", H.DREAM_MODE] : [H.DREAM_MODE, "checked_prolog"];
    for (const row of eligible) for (const mode of order) result.push({ repetition: repetition + 1, case_id: row.case_id, mode, order: mode === order[0] ? 1 : 2 });
  }
  return result;
}
function decisionCorrect(score) {
  // Strict score includes the exact checker receipt wire field. This secondary
  // surface keeps all semantic decision fields strict and relaxes only a sole
  // missing/wrong receipt failure, which is reported separately.
  return !!score?.move && score.failures.every(failure => failure.startsWith("required checked receipt"));
}
function summarize(cells_) {
  const result = {};
  for (const mode of ["checked_prolog", H.DREAM_MODE]) {
    const selected = cells_.filter(cell => cell.mode === mode), correct = selected.filter(cell => cell.score?.correct).length, decision = selected.filter(cell => decisionCorrect(cell.score)).length;
    result[mode] = { attempted: selected.length, strict_correct: correct, decision_correct: decision, total: selected.length };
  }
  return result;
}
async function main() {
  const opts = options(process.argv.slice(2)), dataset = await H.loadDataset();
  const out = path.resolve(opts.out); if (fs.existsSync(out)) throw new Error("output directory already exists"); fs.mkdirSync(out, { recursive: true });
  const configured = spawnSync(H.PYTHON, [path.join(__dirname, "adapter.py"), "--config"], { encoding: "utf8", timeout: 20000, maxBuffer: 65536 });
  if (configured.status !== 0) throw new Error("cannot resolve Hermes model config: " + configured.stderr);
  const runtimeProbe = spawnSync(H.PYTHON, [path.join(__dirname, "runtime_info.py")], { encoding: "utf8", timeout: 20000, maxBuffer: 65536 });
  if (runtimeProbe.status !== 0) throw new Error("cannot pin Hermes runtime: " + runtimeProbe.stderr);
  const runtime = JSON.parse(runtimeProbe.stdout), config = { runtime_fingerprint: runtime.fingerprint, model: opts.model, provider: "openai-codex", reasoning_effort: "low", max_tokens: 4096, max_iterations: 1, timeout_ms: 120000, retries: 0, fallback: null, tools: [] };
  const sourceFiles = ["world/checker.js", "world/checker.pl", "world/journal.js", "world/agent.js", "world/paired-biographies/harness.cjs", "world/paired-biographies/run.cjs", "world/paired-biographies/dream-matrix.cjs", "world/paired-biographies/adapter.py", "world/paired-biographies/transport_guard.py", "world/paired-biographies/runtime_info.py"];
  const sources = sourceFiles.map(file => { const bytes = fs.readFileSync(path.join(H.ROOT, file)), snapshot = path.join("source-snapshot", file); fs.mkdirSync(path.dirname(path.join(out, snapshot)), { recursive: true }); fs.writeFileSync(path.join(out, snapshot), bytes); return { file, sha256: H.sha(bytes), snapshot }; });
  const rows = new Map(dataset.rows.map(row => [row.case_id, row])), plan = cells(dataset.rows, opts.repetitions);
  const report = {
    version: "paired-dream-matrix-v1", status: "running", boundary: "Counterbalanced fresh samples of five authored eligible cases. It compares two host-supplied representations, not spontaneous tool use, extraction, admission, truth, or hidden reasoning.",
    dataset_sha256: dataset.dataset_sha256, schema_sha256: dataset.schema_sha256, config, runtime, sources,
    protocol: { repetitions: opts.repetitions, eligible_cases: [...new Set(plan.map(cell => cell.case_id))], conditions: ["checked_prolog", H.DREAM_MODE], order: "repetition 1 base-first; repetition 2 dream-first; repeats alternate", physical_requests_per_cell: 1, retries: 0, tools: 0, decision_surface: "all strict fields except a sole checker-receipt wire mismatch" },
    cells: [], summary: {}, limitations: ["Synthetic AI-authored gold with human semantic review pending.", "No temperature/top_p control is available on the installed Codex transport.", "Two repetitions are a feasibility measurement, not a significance test or evidence of benefit.", "The dream condition adds host-computed conditional branches, so it is not an equal-information comparison."]
  };
  const save = () => { report.summary = summarize(report.cells); write(path.join(out, "report.json"), report); };
  save();
  for (const cell of plan) {
    const c = rows.get(cell.case_id), directory = path.join(out, "cells", `r${cell.repetition}`, cell.case_id, cell.mode);
    let replay, run, score;
    try {
      replay = await H.replayCase(c, path.join(directory, "memory"), { strategy: cell.mode === H.DREAM_MODE ? "dream" : "missing" });
      const request = cell.mode === H.DREAM_MODE ? H.buildDreamBehavior(c, replay) : H.buildBehavior(c, "checked_prolog", replay);
      run = await invoke(request, path.join(directory, "provider"), config);
      score = H.scoreMove(c, cell.mode, run.final_response || "", run, replay);
    } catch (error) {
      run = { status: "failed", error: error.message, inference_calls: 0, tools: [] }; score = { correct: false, failures: [error.message] };
    }
    report.cells.push({ ...cell, status: run.status, score, usage: run.usage || null, replay: path.relative(out, path.join(directory, "memory", "memory-check.json")), evidence: path.relative(out, path.join(directory, "provider", "adapter.json")), evidence_sha256: run.evidence_sha256 || null });
    save(); process.stdout.write(JSON.stringify({ repetition: cell.repetition, case_id: cell.case_id, mode: cell.mode, status: run.status, strict_correct: score.correct, decision_correct: decisionCorrect(score) }) + "\n");
  }
  report.status = report.cells.some(cell => cell.status !== "ok") ? "completed_with_failures" : "completed"; save();
  process.stdout.write(JSON.stringify({ out, status: report.status, summary: report.summary }) + "\n");
  if (report.status !== "completed") process.exitCode = 1;
}
if (require.main === module) main().catch(error => { process.stderr.write(error.stack + "\n"); process.exitCode = 1; });
module.exports = { options, cells, decisionCorrect, summarize };
