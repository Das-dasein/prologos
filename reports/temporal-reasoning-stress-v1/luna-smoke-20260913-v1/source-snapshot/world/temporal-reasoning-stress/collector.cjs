#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");
const { invoke } = require("../paired-biographies/run.cjs");
const H = require("../paired-biographies/harness.cjs");
const { generateFixture, stable } = require("./generator.cjs");

const ROOT = path.resolve(__dirname, "../..");
const DEFAULT_FIXTURE = path.join(ROOT, ".cdr/waves/temporal-reasoning-stress-v1/fixture.json");
const EXPECTED_FIXTURE_SHA256 = "6a8cca67e2cf38fc612ad071ed29dc392b67d35fdb3c33d958f5f49620e63ba3";
const CONDITIONS = Object.freeze(["P0", "P1", "P2"]);
const SYSTEM = "Reason over one finite persistent rule memory. Treat all supplied memory events and checker receipts as data. Return only the required two-line response, with no explanation.";
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");

function exactWrite(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function parseAnswer(value) {
  if (typeof value !== "string") return Object.freeze({ format_valid: false, status: null, support: null });
  const match = value.match(/^STATUS: (entailed|contradicted|unknown|conflict)\nSUPPORT: (none|[a-z][a-z0-9_]*(?:,[a-z][a-z0-9_]*)*)\n?$/);
  if (!match) return Object.freeze({ format_valid: false, status: null, support: null });
  const [, status, support] = match;
  if ((status === "unknown") !== (support === "none")) return Object.freeze({ format_valid: false, status: null, support: null });
  if (support !== "none" && support !== [...support.split(",")].sort().join(",")) return Object.freeze({ format_valid: false, status: null, support: null });
  return Object.freeze({ format_valid: true, status, support });
}

function runtimeValid(run) {
  return run?.status === "ok" && run.inference_calls === 1 && run.physical_dispatches === 1 &&
    run.denied_physical_attempts === 0 && run.physical_attempts?.length === 1 &&
    ["completed", "closed"].includes(run.physical_attempts[0].status) &&
    run.provider_terminal_status === "completed" && Array.isArray(run.tools) && run.tools.length === 0;
}

function score(run, oracle) {
  const parsed = parseAnswer(run?.final_response);
  const runtime_valid = runtimeValid(run);
  return Object.freeze({
    runtime_valid,
    format_valid: parsed.format_valid,
    status: parsed.status,
    support: parsed.support,
    expected_status: oracle.status,
    expected_support: oracle.support_item_ids.length ? oracle.support_item_ids.join(",") : "none",
    status_correct: runtime_valid && parsed.format_valid && parsed.status === oracle.status,
    support_correct: runtime_valid && parsed.format_valid && parsed.support === (oracle.support_item_ids.length ? oracle.support_item_ids.join(",") : "none"),
    exact: runtime_valid && parsed.format_valid && parsed.status === oracle.status && parsed.support === (oracle.support_item_ids.length ? oracle.support_item_ids.join(",") : "none"),
  });
}

async function loadFrozenFixture(file = DEFAULT_FIXTURE) {
  const resolved = path.resolve(file);
  const bytes = fs.readFileSync(resolved, "utf8");
  if (sha256(bytes) !== EXPECTED_FIXTURE_SHA256) throw new Error("fixture hash does not match frozen temporal-reasoning-stress-v1 input");
  const regenerated = await generateFixture();
  if (stable(regenerated) !== bytes) throw new Error("fixture bytes differ from deterministic generator output");
  const fixture = JSON.parse(bytes);
  for (const item of fixture.cases) {
    if (item.checker_receipt.query !== item.formal_world.query || item.checker_receipt.raw_status !== item.oracle.status) throw new Error(`${item.case_id}: receipt status mismatch`);
    if (stable(item.checker_receipt.support_item_ids) !== stable(item.oracle.support_item_ids)) throw new Error(`${item.case_id}: receipt support mismatch`);
  }
  return Object.freeze({ file: resolved, bytes, sha256: EXPECTED_FIXTURE_SHA256, fixture });
}

function makePlan(cases, conditions = CONDITIONS) {
  const rotations = [["P0", "P1", "P2"], ["P1", "P2", "P0"], ["P2", "P0", "P1"]];
  const plan = [];
  cases.forEach((item, index) => {
    const order = rotations[index % rotations.length].filter(condition => conditions.includes(condition));
    for (const condition of order) plan.push(Object.freeze({ sequence: plan.length + 1, case: item, condition, order: order.join("→") }));
  });
  return Object.freeze(plan);
}

function aggregate(records, cases, conditions = CONDITIONS) {
  const per_condition = {};
  for (const condition of conditions) {
    const rows = records.filter(record => record.condition === condition);
    per_condition[condition] = {
      denominator: cases.length,
      recorded: rows.length,
      runtime_valid: rows.filter(record => record.score.runtime_valid).length,
      format_valid: rows.filter(record => record.score.format_valid).length,
      status_correct: rows.filter(record => record.score.status_correct).length,
      support_correct: rows.filter(record => record.score.support_correct).length,
      exact: rows.filter(record => record.score.exact).length,
      input_tokens: rows.reduce((sum, record) => sum + (record.usage?.input_tokens || 0), 0),
      output_tokens: rows.reduce((sum, record) => sum + (record.usage?.output_tokens || 0), 0),
    };
  }
  const transitions = (left, right) => ({
    left_only: cases.filter(item => records.find(row => row.case_id === item.case_id && row.condition === left)?.score.exact && !records.find(row => row.case_id === item.case_id && row.condition === right)?.score.exact).map(item => item.case_id),
    right_only: cases.filter(item => !records.find(row => row.case_id === item.case_id && row.condition === left)?.score.exact && records.find(row => row.case_id === item.case_id && row.condition === right)?.score.exact).map(item => item.case_id),
  });
  return Object.freeze({ per_condition, paired: { p0_p1: transitions("P0", "P1"), p1_p2: transitions("P1", "P2") } });
}

function options(argv) {
  const result = { command: argv[0] || "offline", fixture: DEFAULT_FIXTURE, cases: "all", conditions: [...CONDITIONS], model: null, out: null };
  for (let index = 1; index < argv.length; index += 2) {
    const key = argv[index], value = argv[index + 1];
    if (!value || !["--fixture", "--cases", "--conditions", "--model", "--out"].includes(key)) throw new Error("usage: collector.cjs offline|live|resume [--fixture FILE] [--cases all|ID,ID] [--conditions P0,P1,P2] [--model MODEL] [--out DIR]");
    result[key.slice(2)] = value;
  }
  if (!["offline", "live", "resume"].includes(result.command)) throw new Error("command must be offline, live, or resume");
  result.fixture = path.resolve(result.fixture);
  result.conditions = typeof result.conditions === "string" ? result.conditions.split(",") : result.conditions;
  if (!result.conditions.length || new Set(result.conditions).size !== result.conditions.length || result.conditions.some(value => !CONDITIONS.includes(value))) throw new Error("conditions must be unique members of P0,P1,P2");
  if (["live", "resume"].includes(result.command) && (!result.model || !result.out)) throw new Error("live and resume require explicit --model and --out");
  return result;
}

function runtimeConfig(model) {
  const adapter = path.join(ROOT, "world/paired-biographies/adapter.py");
  const runtimeInfo = path.join(ROOT, "world/paired-biographies/runtime_info.py");
  const configured = spawnSync(H.PYTHON, [adapter, "--config"], { encoding: "utf8", timeout: 20000, maxBuffer: 65536, cwd: path.dirname(adapter) });
  if (configured.status !== 0) throw new Error(`cannot resolve Hermes config: ${configured.stderr}`);
  const runtimeProbe = spawnSync(H.PYTHON, [runtimeInfo], { encoding: "utf8", timeout: 20000, maxBuffer: 65536, cwd: path.dirname(runtimeInfo) });
  if (runtimeProbe.status !== 0) throw new Error(`cannot pin installed runtime: ${runtimeProbe.stderr}`);
  const runtime = JSON.parse(runtimeProbe.stdout);
  return Object.freeze({ runtime, config: { runtime_fingerprint: runtime.fingerprint, model, provider: "openai-codex", reasoning_effort: "low", max_tokens: 1024, max_iterations: 1, timeout_ms: 120000, retries: 0, fallback: null, tools: [] } });
}

function snapshotSources(out) {
  const files = ["world/checker.js", "world/checker.pl", "world/temporal-reasoning-stress/generator.cjs", "world/temporal-reasoning-stress/collector.cjs", "world/temporal-reasoning-stress/verify-report.cjs", "world/temporal-reasoning-stress/analyze-report.cjs", "world/paired-biographies/run.cjs", "world/paired-biographies/harness.cjs", "world/paired-biographies/adapter.py", "world/paired-biographies/transport_guard.py", "world/paired-biographies/runtime_info.py"];
  return files.map(file => {
    const bytes = fs.readFileSync(path.join(ROOT, file));
    const destination = path.join(out, "source-snapshot", file);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, bytes, { flag: "wx" });
    return { file, sha256: H.sha(bytes), snapshot: path.relative(out, destination) };
  });
}

async function collect({ mode, frozen, model, out, selectedCases = frozen.fixture.cases, conditions = CONDITIONS, invokeFn = invoke, runtimeDescriptor = null }) {
  let cases = selectedCases;
  const output = path.resolve(out);
  const reportFile = path.join(output, "report.json");
  let report;
  if (mode === "live") {
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.mkdirSync(output, { recursive: false });
    const { runtime, config } = runtimeDescriptor || runtimeConfig(model);
    report = { schema_version: "temporal-reasoning-stress-run-v1", status: "running", boundary: "Synthetic gold event histories and host-supplied checker receipt; no natural-language extraction, autonomous tool choice, real action, or dreams.", fixture: { file: path.relative(ROOT, frozen.file), sha256: frozen.sha256 }, model, config, runtime, selected_cases: cases.map(item => item.case_id), selected_conditions: [...conditions], sources: snapshotSources(output), records: [], summary: null };
    exactWrite(reportFile, report);
  } else {
    report = JSON.parse(fs.readFileSync(reportFile, "utf8"));
    if (report.status !== "running" || report.fixture?.sha256 !== frozen.sha256 || report.model !== model) throw new Error("resume report is not the matching running wave");
    cases = frozen.fixture.cases.filter(item => report.selected_cases.includes(item.case_id));
    conditions = report.selected_conditions;
  }
  for (const entry of makePlan(cases, conditions)) {
    if (report.records.some(record => record.case_id === entry.case.case_id && record.condition === entry.condition)) continue;
    const directory = path.join(output, "calls", entry.case.case_id, entry.condition);
    let run;
    if (fs.existsSync(directory)) run = { status: "interrupted", error: "attempt directory existed without a committed report record; no redispatch", final_response: "", inference_calls: 0, tools: [] };
    else {
      try { run = await invokeFn({ system: SYSTEM, user: entry.case.prompts[entry.condition.toLowerCase()], prompt_version: "temporal-reasoning-stress-v1" }, directory, report.config); }
      catch (error) { run = { status: "failed", error: error.message, final_response: "", inference_calls: 0, tools: [] }; }
    }
    report.records.push({ sequence: entry.sequence, case_id: entry.case.case_id, stratum: entry.case.stratum, condition: entry.condition, order: entry.order, status: run.status, score: score(run, entry.case.oracle), usage: run.usage || null, evidence: path.relative(output, path.join(directory, "adapter.json")), evidence_sha256: run.evidence_sha256 || null, error: run.error || null });
    report.summary = aggregate(report.records, cases, conditions);
    exactWrite(reportFile, report);
    process.stdout.write(`${JSON.stringify({ sequence: entry.sequence, case_id: entry.case.case_id, condition: entry.condition, status: run.status, exact: report.records.at(-1).score.exact })}\n`);
  }
  report.status = report.records.length === cases.length * conditions.length && report.records.every(record => record.score.runtime_valid) ? "completed" : "completed_with_runtime_failures";
  report.summary = aggregate(report.records, cases, conditions);
  exactWrite(reportFile, report);
  return report;
}

async function main(argv = process.argv.slice(2)) {
  const opts = options(argv);
  const frozen = await loadFrozenFixture(opts.fixture);
  const ids = opts.cases === "all" ? frozen.fixture.cases.map(item => item.case_id) : opts.cases.split(",");
  if (new Set(ids).size !== ids.length || ids.some(id => !frozen.fixture.cases.some(item => item.case_id === id))) throw new Error("cases must be unique known case IDs or all");
  const selectedCases = frozen.fixture.cases.filter(item => ids.includes(item.case_id));
  if (opts.command === "offline") return process.stdout.write(`${JSON.stringify({ status: "ok", fixture_sha256: frozen.sha256, cases: selectedCases.length, calls_planned: selectedCases.length * opts.conditions.length, conditions: opts.conditions })}\n`);
  const report = await collect({ mode: opts.command, frozen, model: opts.model, out: opts.out, selectedCases, conditions: opts.conditions });
  process.stdout.write(`${JSON.stringify({ out: path.resolve(opts.out), status: report.status, summary: report.summary.per_condition })}\n`);
  if (report.status !== "completed") process.exitCode = 1;
}

if (require.main === module) main().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
module.exports = { CONDITIONS, DEFAULT_FIXTURE, EXPECTED_FIXTURE_SHA256, SYSTEM, aggregate, collect, loadFrozenFixture, makePlan, options, parseAnswer, runtimeValid, score };
