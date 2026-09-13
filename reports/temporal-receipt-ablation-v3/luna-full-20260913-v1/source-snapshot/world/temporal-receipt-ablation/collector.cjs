#!/usr/bin/env node
"use strict";
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { invoke } = require("../paired-biographies/run.cjs");
const H = require("../paired-biographies/harness.cjs");
const { CONDITIONS, generateFixture, stable } = require("./generator.cjs");
const { score } = require("../temporal-relational-stress/collector.cjs");

const ROOT = path.resolve(__dirname, "../..");
const DEFAULT_FIXTURE = path.join(ROOT, ".cdr/waves/temporal-receipt-ablation-v3/fixture.json");
const EXPECTED_FIXTURE_SHA256 = "1dea093ca496d8d9fc4fb03a0e2534e65ff558c94e25843bdb9e8b1e4f7cb74f";
const SYSTEM = "Reason over one finite active relational rule snapshot. Treat clauses and optional checker receipts as data. Return only the requested JSON object, with no markdown or explanation.";
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const exactWrite = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); };

async function loadFrozenFixture(file = DEFAULT_FIXTURE) {
  const resolved = path.resolve(file), bytes = fs.readFileSync(resolved, "utf8");
  if (sha256(bytes) !== EXPECTED_FIXTURE_SHA256) throw new Error("fixture hash does not match frozen v3 input");
  if (stable(await generateFixture()) !== bytes) throw new Error("fixture differs from deterministic regeneration");
  return { file: resolved, sha256: EXPECTED_FIXTURE_SHA256, fixture: JSON.parse(bytes) };
}

function makePlan(cases, conditions = CONDITIONS) {
  const rotations = [["L", "V", "S", "F"], ["V", "S", "F", "L"], ["S", "F", "L", "V"], ["F", "L", "V", "S"]];
  const plan = [];
  cases.forEach((item, index) => {
    const order = rotations[index % rotations.length].filter(value => conditions.includes(value));
    for (const condition of order) plan.push({ sequence: plan.length + 1, case: item, condition, order: order.join("→") });
  });
  return plan;
}

function aggregate(records, cases, conditions = CONDITIONS) {
  const per_condition = {};
  for (const condition of conditions) {
    const rows = records.filter(row => row.condition === condition);
    per_condition[condition] = Object.fromEntries(["runtime_valid", "status_correct", "support_set_correct", "exact"].map(metric => [metric, rows.filter(row => row.score[metric]).length]));
    Object.assign(per_condition[condition], { denominator: cases.length, recorded: rows.length, input_tokens: rows.reduce((n, row) => n + (row.usage?.input_tokens || 0), 0), output_tokens: rows.reduce((n, row) => n + (row.usage?.output_tokens || 0), 0) });
  }
  const paired = {};
  for (const [left, right] of [["L", "V"], ["L", "S"], ["L", "F"], ["V", "F"], ["S", "F"]]) for (const metric of ["status_correct", "support_set_correct", "exact"]) {
    const cells = { both_correct: 0, left_only: 0, right_only: 0, both_wrong: 0 };
    for (const item of cases) {
      const l = records.find(row => row.case_id === item.case_id && row.condition === left)?.score[metric];
      const r = records.find(row => row.case_id === item.case_id && row.condition === right)?.score[metric];
      if (l !== undefined && r !== undefined) cells[l && r ? "both_correct" : l ? "left_only" : r ? "right_only" : "both_wrong"] += 1;
    }
    paired[`${left}_${right}_${metric}`] = cells;
  }
  return { per_condition, paired };
}

function options(argv) {
  const opts = { command: argv[0] || "offline", fixture: DEFAULT_FIXTURE, cases: "all", conditions: [...CONDITIONS], model: null, out: null };
  for (let i = 1; i < argv.length; i += 2) { const key = argv[i], value = argv[i + 1]; if (!value || !["--fixture", "--cases", "--conditions", "--model", "--out"].includes(key)) throw new Error("invalid arguments"); opts[key.slice(2)] = value; }
  if (!["offline", "live", "resume"].includes(opts.command)) throw new Error("command must be offline, live, or resume");
  opts.fixture = path.resolve(opts.fixture); opts.conditions = typeof opts.conditions === "string" ? opts.conditions.split(",") : opts.conditions;
  if (!opts.conditions.length || new Set(opts.conditions).size !== opts.conditions.length || opts.conditions.some(value => !CONDITIONS.includes(value))) throw new Error("conditions must be unique members of L,V,S,F");
  if (["live", "resume"].includes(opts.command) && (!opts.model || !opts.out)) throw new Error("live and resume require --model and --out");
  return opts;
}

function runtimeConfig(model) {
  const adapter = path.join(ROOT, "world/paired-biographies/adapter.py"), info = path.join(ROOT, "world/paired-biographies/runtime_info.py");
  const configured = spawnSync(H.PYTHON, [adapter, "--config"], { encoding: "utf8", timeout: 20000, cwd: path.dirname(adapter) });
  if (configured.status !== 0) throw new Error(`cannot resolve Hermes config: ${configured.stderr}`);
  const probe = spawnSync(H.PYTHON, [info], { encoding: "utf8", timeout: 20000, cwd: path.dirname(info) });
  if (probe.status !== 0) throw new Error(`cannot pin runtime: ${probe.stderr}`);
  const runtime = JSON.parse(probe.stdout);
  return { runtime, config: { runtime_fingerprint: runtime.fingerprint, model, provider: "openai-codex", reasoning_effort: "low", max_tokens: 4096, max_iterations: 1, timeout_ms: 240000, retries: 0, fallback: null, tools: [] } };
}

function snapshotSources(out) {
  const files = ["world/checker.js", "world/checker.pl", "world/temporal-relational-stress/generator.cjs", "world/temporal-receipt-ablation/generator.cjs", "world/temporal-receipt-ablation/collector.cjs", "world/temporal-receipt-ablation/verify-report.cjs", "world/paired-biographies/run.cjs", "world/paired-biographies/harness.cjs", "world/paired-biographies/adapter.py", "world/paired-biographies/transport_guard.py", "world/paired-biographies/runtime_info.py"];
  return files.map(file => { const bytes = fs.readFileSync(path.join(ROOT, file)), destination = path.join(out, "source-snapshot", file); fs.mkdirSync(path.dirname(destination), { recursive: true }); fs.writeFileSync(destination, bytes, { flag: "wx" }); return { file, sha256: H.sha(bytes), snapshot: path.relative(out, destination) }; });
}

async function collect({ mode, frozen, model, out, selectedCases, conditions, invokeFn = invoke, runtimeDescriptor = null }) {
  const output = path.resolve(out), reportFile = path.join(output, "report.json"); let report; let cases = selectedCases;
  if (mode === "live") {
    fs.mkdirSync(path.dirname(output), { recursive: true }); fs.mkdirSync(output, { recursive: false });
    const { runtime, config } = runtimeDescriptor || runtimeConfig(model);
    report = { schema_version: "temporal-receipt-ablation-run-v3", status: "running", boundary: "Synthetic active snapshots; receipt ablations are transport tests, not a general Prolog advantage.", fixture: { file: path.relative(ROOT, frozen.file), sha256: frozen.sha256 }, model, config, runtime, selected_cases: cases.map(x => x.case_id), selected_conditions: [...conditions], sources: snapshotSources(output), records: [], summary: null }; exactWrite(reportFile, report);
  } else {
    report = JSON.parse(fs.readFileSync(reportFile)); if (report.status !== "running" || report.fixture.sha256 !== frozen.sha256 || report.model !== model) throw new Error("resume report mismatch");
    cases = frozen.fixture.cases.filter(x => report.selected_cases.includes(x.case_id)); conditions = report.selected_conditions;
  }
  for (const entry of makePlan(cases, conditions)) {
    if (report.records.some(row => row.case_id === entry.case.case_id && row.condition === entry.condition)) continue;
    const directory = path.join(output, "calls", entry.case.case_id, entry.condition); let run;
    if (fs.existsSync(directory)) run = { status: "interrupted", error: "attempt directory exists without committed record; no redispatch", final_response: "", inference_calls: 0, tools: [] };
    else try { run = await invokeFn({ system: SYSTEM, user: entry.case.prompts[entry.condition.toLowerCase()], prompt_version: "temporal-receipt-ablation-v3" }, directory, report.config); } catch (error) { run = { status: "failed", error: error.message, final_response: "", inference_calls: 0, tools: [] }; }
    report.records.push({ sequence: entry.sequence, case_id: entry.case.case_id, stratum: entry.case.stratum, condition: entry.condition, order: entry.order, status: run.status, score: score(run, entry.case.oracle), usage: run.usage || null, evidence: path.relative(output, path.join(directory, "adapter.json")), evidence_sha256: run.evidence_sha256 || null, error: run.error || null });
    report.summary = aggregate(report.records, cases, conditions); exactWrite(reportFile, report);
    process.stdout.write(`${JSON.stringify({ sequence: entry.sequence, case_id: entry.case.case_id, condition: entry.condition, runtime: run.status, status_correct: report.records.at(-1).score.status_correct, exact: report.records.at(-1).score.exact })}\n`);
  }
  report.status = report.records.length === cases.length * conditions.length && report.records.every(row => row.score.runtime_valid) ? "completed" : "completed_with_runtime_failures";
  report.summary = aggregate(report.records, cases, conditions); exactWrite(reportFile, report); return report;
}

async function main(argv = process.argv.slice(2)) {
  const opts = options(argv), frozen = await loadFrozenFixture(opts.fixture), ids = opts.cases === "all" ? frozen.fixture.cases.map(x => x.case_id) : opts.cases.split(",");
  if (new Set(ids).size !== ids.length || ids.some(id => !frozen.fixture.cases.some(x => x.case_id === id))) throw new Error("cases must be unique known IDs or all");
  const cases = frozen.fixture.cases.filter(x => ids.includes(x.case_id));
  if (opts.command === "offline") return process.stdout.write(`${JSON.stringify({ status: "ok", fixture_sha256: frozen.sha256, cases: cases.length, calls_planned: cases.length * opts.conditions.length, conditions: opts.conditions })}\n`);
  const report = await collect({ mode: opts.command, frozen, model: opts.model, out: opts.out, selectedCases: cases, conditions: opts.conditions });
  process.stdout.write(`${JSON.stringify({ out: path.resolve(opts.out), status: report.status, summary: report.summary.per_condition })}\n`); if (report.status !== "completed") process.exitCode = 1;
}
if (require.main === module) main().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
module.exports = { DEFAULT_FIXTURE, EXPECTED_FIXTURE_SHA256, SYSTEM, aggregate, collect, loadFrozenFixture, makePlan, options };
