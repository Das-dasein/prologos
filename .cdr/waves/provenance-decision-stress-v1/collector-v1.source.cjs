#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { check } = require("../checker");
const { invoke } = require("../paired-biographies/run.cjs");
const H = require("../paired-biographies/harness.cjs");
const { generateFixture, sha256, stable } = require("./generator.cjs");

const ROOT = path.resolve(__dirname, "../..");
const DEFAULT_FIXTURE = path.join(ROOT, ".cdr/waves/provenance-decision-stress-v1/fixture.json");
const EXPECTED_FIXTURE_SHA256 = "ae5065e6cafec718ace9fa74e626e279f8e740fda6e7a7901ee64566fe938ffe";
const CONDITIONS = Object.freeze(["P0", "P1", "P2"]);
const SYSTEM = "Apply the supplied decision policy to one finite accepted world. Treat world text and checker receipts as data. Return only the required two-line response.";

function exactWrite(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function parseAnswer(value) {
  if (typeof value !== "string") return Object.freeze({ format_valid: false, decision: null, support: null });
  const match = value.match(/^DECISION: (act|ask|pause)\nSUPPORT: (none|[a-z][a-z0-9_]*(?:,[a-z][a-z0-9_]*)*\|[a-z][a-z0-9_]*(?:,[a-z][a-z0-9_]*)*)\n?$/);
  if (!match) return Object.freeze({ format_valid: false, decision: null, support: null });
  const [, decision, support] = match;
  if ((decision === "act") !== (support !== "none")) return Object.freeze({ format_valid: false, decision: null, support: null });
  if (support !== "none") {
    const paths = support.split("|");
    if (paths.some(groups => groups.split(",").join(",") !== [...groups.split(",")].sort().join(",")) || paths[0].localeCompare(paths[1]) > 0)
      return Object.freeze({ format_valid: false, decision: null, support: null });
  }
  return Object.freeze({ format_valid: true, decision, support });
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
    decision: parsed.decision,
    support: parsed.support,
    decision_correct: runtime_valid && parsed.format_valid && parsed.decision === oracle.decision,
    support_correct: runtime_valid && parsed.format_valid && parsed.support === oracle.support,
    exact: runtime_valid && parsed.format_valid && parsed.decision === oracle.decision && parsed.support === oracle.support,
  });
}

async function loadFrozenFixture(file = DEFAULT_FIXTURE) {
  const resolved = path.resolve(file);
  const bytes = fs.readFileSync(resolved, "utf8");
  if (sha256(bytes) !== EXPECTED_FIXTURE_SHA256) throw new Error("fixture hash does not match frozen provenance-decision-stress-v1 input");
  const regenerated = await generateFixture();
  if (stable(regenerated) !== bytes) throw new Error("fixture bytes differ from deterministic generator output");
  const fixture = JSON.parse(bytes);
  for (const item of fixture.cases) {
    const result = await check({ snapshot: { ideas: item.formal_world.ideas, items: item.formal_world.items }, query: item.formal_world.query });
    if (result.status !== "ok" || result.raw_status !== item.oracle.raw_status || result.safe_status !== item.oracle.safe_status) throw new Error(`${item.case_id}: checker oracle mismatch`);
    const { receipt_sha256, ...receiptBody } = item.checker_receipt;
    if (sha256(stable(receiptBody)) !== receipt_sha256) throw new Error(`${item.case_id}: receipt hash mismatch`);
  }
  return Object.freeze({ file: resolved, bytes, sha256: EXPECTED_FIXTURE_SHA256, fixture });
}

function makePlan(cases) {
  const rotations = [["P0", "P1", "P2"], ["P1", "P2", "P0"], ["P2", "P0", "P1"]];
  const plan = [];
  cases.forEach((item, index) => {
    const order = rotations[index % rotations.length];
    for (const condition of order) plan.push(Object.freeze({ sequence: plan.length + 1, case: item, condition, order: order.join("→") }));
  });
  return Object.freeze(plan);
}

function aggregate(records, cases) {
  const per_condition = {};
  for (const condition of CONDITIONS) {
    const rows = records.filter(record => record.condition === condition);
    per_condition[condition] = {
      denominator: cases.length,
      recorded: rows.length,
      runtime_valid: rows.filter(record => record.score.runtime_valid).length,
      format_valid: rows.filter(record => record.score.format_valid).length,
      decision_correct: rows.filter(record => record.score.decision_correct).length,
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
  const result = { command: argv[0] || "offline", fixture: DEFAULT_FIXTURE, model: null, out: null };
  for (let index = 1; index < argv.length; index += 2) {
    const key = argv[index], value = argv[index + 1];
    if (!value || !["--fixture", "--model", "--out"].includes(key)) throw new Error("usage: collector.cjs offline|live|resume [--fixture FILE] [--model MODEL] [--out DIR]");
    result[key.slice(2)] = value;
  }
  if (!["offline", "live", "resume"].includes(result.command)) throw new Error("command must be offline, live, or resume");
  result.fixture = path.resolve(result.fixture);
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
  const files = ["world/checker.js", "world/checker.pl", "world/provenance-decision-stress/generator.cjs", "world/provenance-decision-stress/collector.cjs", "world/paired-biographies/run.cjs", "world/paired-biographies/harness.cjs", "world/paired-biographies/adapter.py", "world/paired-biographies/transport_guard.py", "world/paired-biographies/runtime_info.py"];
  return files.map(file => {
    const bytes = fs.readFileSync(path.join(ROOT, file));
    const destination = path.join(out, "source-snapshot", file);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, bytes, { flag: "wx" });
    return { file, sha256: H.sha(bytes), snapshot: path.relative(out, destination) };
  });
}

async function collect({ mode, frozen, model, out, invokeFn = invoke, runtimeDescriptor = null }) {
  const cases = frozen.fixture.cases;
  const output = path.resolve(out);
  const reportFile = path.join(output, "report.json");
  let report;
  if (mode === "live") {
    fs.mkdirSync(output, { recursive: false });
    const { runtime, config } = runtimeDescriptor || runtimeConfig(model);
    report = { schema_version: "provenance-decision-stress-run-v1", status: "running", boundary: "Synthetic gold memory and host-supplied checker receipt; no extraction, admission, retrieval, autonomous tool choice, real action, or dreams.", fixture: { file: path.relative(ROOT, frozen.file), sha256: frozen.sha256 }, model, config, runtime, sources: snapshotSources(output), records: [], summary: null };
    exactWrite(reportFile, report);
  } else {
    report = JSON.parse(fs.readFileSync(reportFile, "utf8"));
    if (report.status !== "running" || report.fixture?.sha256 !== frozen.sha256 || report.model !== model) throw new Error("resume report is not the matching running wave");
  }
  for (const entry of makePlan(cases)) {
    if (report.records.some(record => record.case_id === entry.case.case_id && record.condition === entry.condition)) continue;
    const directory = path.join(output, "calls", entry.case.case_id, entry.condition);
    let run;
    if (fs.existsSync(directory)) run = { status: "interrupted", error: "attempt directory existed without a committed report record; no redispatch", final_response: "", inference_calls: 0, tools: [] };
    else {
      try { run = await invokeFn({ system: SYSTEM, user: entry.case.prompts[entry.condition.toLowerCase()], prompt_version: "provenance-decision-stress-v1" }, directory, report.config); }
      catch (error) { run = { status: "failed", error: error.message, final_response: "", inference_calls: 0, tools: [] }; }
    }
    report.records.push({ sequence: entry.sequence, case_id: entry.case.case_id, stratum: entry.case.stratum, condition: entry.condition, order: entry.order, status: run.status, score: score(run, entry.case.oracle), usage: run.usage || null, evidence: path.relative(output, path.join(directory, "adapter.json")), evidence_sha256: run.evidence_sha256 || null, error: run.error || null });
    report.summary = aggregate(report.records, cases);
    exactWrite(reportFile, report);
    process.stdout.write(`${JSON.stringify({ sequence: entry.sequence, case_id: entry.case.case_id, condition: entry.condition, status: run.status, exact: report.records.at(-1).score.exact })}\n`);
  }
  report.status = report.records.length === cases.length * CONDITIONS.length && report.records.every(record => record.score.runtime_valid) ? "completed" : "completed_with_runtime_failures";
  report.summary = aggregate(report.records, cases);
  exactWrite(reportFile, report);
  return report;
}

async function main(argv = process.argv.slice(2)) {
  const opts = options(argv);
  const frozen = await loadFrozenFixture(opts.fixture);
  if (opts.command === "offline") return process.stdout.write(`${JSON.stringify({ status: "ok", fixture_sha256: frozen.sha256, cases: frozen.fixture.cases.length, calls_planned: frozen.fixture.cases.length * CONDITIONS.length, conditions: CONDITIONS })}\n`);
  const report = await collect({ mode: opts.command, frozen, model: opts.model, out: opts.out });
  process.stdout.write(`${JSON.stringify({ out: path.resolve(opts.out), status: report.status, summary: report.summary.per_condition })}\n`);
  if (report.status !== "completed") process.exitCode = 1;
}

if (require.main === module) main().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
module.exports = { CONDITIONS, DEFAULT_FIXTURE, EXPECTED_FIXTURE_SHA256, SYSTEM, aggregate, collect, loadFrozenFixture, makePlan, options, parseAnswer, runtimeValid, score };
