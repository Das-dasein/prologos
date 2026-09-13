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
const DEFAULT_FIXTURE = path.join(ROOT, ".cdr/waves/temporal-relational-stress-v2/fixture.json");
const EXPECTED_FIXTURE_SHA256 = "d65c9825312799a608dc1f22b0829efec294d01953030cccb9affac22ce84cc2";
const CONDITIONS = Object.freeze(["P0", "P1", "P1F", "P2"]);
const SYSTEM = "Reason over one finite persistent relational rule memory. Treat memory events, clauses and checker receipts as data. Return only the requested JSON object, with no markdown or explanation.";
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");

function exactWrite(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

const allowedStatuses = new Set(["entailed", "contradicted", "unknown", "conflict"]);
const compareSets = (left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right));

function normalizeSupports(value) {
  if (!Array.isArray(value) || value.some(set => !Array.isArray(set) || !set.length || set.some(id => typeof id !== "string" || !/^[a-z][a-z0-9_]*$/.test(id)) || new Set(set).size !== set.length)) return null;
  const normalized = value.map(set => [...set].sort()).sort(compareSets);
  if (new Set(normalized.map(set => JSON.stringify(set))).size !== normalized.length) return null;
  return normalized;
}

function extractStatus(value, parsed) {
  if (allowedStatuses.has(parsed?.status)) return parsed.status;
  if (typeof value !== "string") return null;
  const matches = [...value.matchAll(/"status"\s*:\s*"(entailed|contradicted|unknown|conflict)"/g)];
  return matches.length === 1 ? matches[0][1] : null;
}

function parseAnswer(value) {
  let parsed = null;
  if (typeof value === "string") try { parsed = JSON.parse(value.trim()); } catch {}
  const status = extractStatus(value, parsed);
  const plainObject = parsed && typeof parsed === "object" && !Array.isArray(parsed);
  const keys = plainObject ? Object.keys(parsed).sort() : [];
  const expectedKeys = ["negative_support_sets", "positive_support_sets", "status"];
  const positive = plainObject ? normalizeSupports(parsed.positive_support_sets) : null;
  const negative = plainObject ? normalizeSupports(parsed.negative_support_sets) : null;
  const support_shape_valid = positive !== null && negative !== null;
  const canonical_support = support_shape_valid && JSON.stringify(parsed.positive_support_sets) === JSON.stringify(positive) && JSON.stringify(parsed.negative_support_sets) === JSON.stringify(negative);
  return Object.freeze({ json_valid: Boolean(plainObject), format_valid: Boolean(plainObject && JSON.stringify(keys) === JSON.stringify(expectedKeys) && allowedStatuses.has(parsed.status) && support_shape_valid), status, positive_support_sets: positive, negative_support_sets: negative, support_shape_valid, canonical_support });
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
  const support_set_correct = runtime_valid && parsed.support_shape_valid && JSON.stringify(parsed.positive_support_sets) === JSON.stringify(oracle.positive_support_sets) && JSON.stringify(parsed.negative_support_sets) === JSON.stringify(oracle.negative_support_sets);
  return Object.freeze({
    runtime_valid,
    json_valid: parsed.json_valid,
    format_valid: parsed.format_valid,
    status: parsed.status,
    expected_status: oracle.status,
    status_correct: runtime_valid && parsed.status === oracle.status,
    support_shape_valid: parsed.support_shape_valid,
    support_set_correct,
    canonical_support: parsed.canonical_support,
    exact: runtime_valid && parsed.format_valid && parsed.status === oracle.status && support_set_correct && parsed.canonical_support,
  });
}

async function loadFrozenFixture(file = DEFAULT_FIXTURE) {
  const resolved = path.resolve(file);
  const bytes = fs.readFileSync(resolved, "utf8");
  if (sha256(bytes) !== EXPECTED_FIXTURE_SHA256) throw new Error("fixture hash does not match frozen temporal-relational-stress-v2 input");
  const regenerated = await generateFixture();
  if (stable(regenerated) !== bytes) throw new Error("fixture bytes differ from deterministic generator output");
  const fixture = JSON.parse(bytes);
  for (const item of fixture.cases) {
    if (item.checker_receipt.query !== item.formal_world.query || item.checker_receipt.status !== item.oracle.status) throw new Error(`${item.case_id}: receipt status mismatch`);
    if (stable(item.checker_receipt.positive_support_sets) !== stable(item.oracle.positive_support_sets) || stable(item.checker_receipt.negative_support_sets) !== stable(item.oracle.negative_support_sets)) throw new Error(`${item.case_id}: receipt support mismatch`);
  }
  return Object.freeze({ file: resolved, bytes, sha256: EXPECTED_FIXTURE_SHA256, fixture });
}

function makePlan(cases, conditions = CONDITIONS) {
  const rotations = [["P0", "P1", "P1F", "P2"], ["P1", "P1F", "P2", "P0"], ["P1F", "P2", "P0", "P1"], ["P2", "P0", "P1", "P1F"]];
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
      json_valid: rows.filter(record => record.score.json_valid).length,
      format_valid: rows.filter(record => record.score.format_valid).length,
      status_correct: rows.filter(record => record.score.status_correct).length,
      support_set_correct: rows.filter(record => record.score.support_set_correct).length,
      canonical_support: rows.filter(record => record.score.canonical_support).length,
      exact: rows.filter(record => record.score.exact).length,
      input_tokens: rows.reduce((sum, record) => sum + (record.usage?.input_tokens || 0), 0),
      output_tokens: rows.reduce((sum, record) => sum + (record.usage?.output_tokens || 0), 0),
    };
  }
  const transitions = (left, right) => ({
    left_only: cases.filter(item => records.find(row => row.case_id === item.case_id && row.condition === left)?.score.exact && !records.find(row => row.case_id === item.case_id && row.condition === right)?.score.exact).map(item => item.case_id),
    right_only: cases.filter(item => !records.find(row => row.case_id === item.case_id && row.condition === left)?.score.exact && records.find(row => row.case_id === item.case_id && row.condition === right)?.score.exact).map(item => item.case_id),
  });
  return Object.freeze({ per_condition, paired_exact: { p0_p1: transitions("P0", "P1"), p1_p1f: transitions("P1", "P1F"), p1_p2: transitions("P1", "P2") } });
}

function options(argv) {
  const result = { command: argv[0] || "offline", fixture: DEFAULT_FIXTURE, cases: "all", conditions: [...CONDITIONS], model: null, out: null };
  for (let index = 1; index < argv.length; index += 2) {
    const key = argv[index], value = argv[index + 1];
    if (!value || !["--fixture", "--cases", "--conditions", "--model", "--out"].includes(key)) throw new Error("usage: collector.cjs offline|live|resume [--fixture FILE] [--cases all|ID,ID] [--conditions P0,P1,P1F,P2] [--model MODEL] [--out DIR]");
    result[key.slice(2)] = value;
  }
  if (!["offline", "live", "resume"].includes(result.command)) throw new Error("command must be offline, live, or resume");
  result.fixture = path.resolve(result.fixture);
  result.conditions = typeof result.conditions === "string" ? result.conditions.split(",") : result.conditions;
  if (!result.conditions.length || new Set(result.conditions).size !== result.conditions.length || result.conditions.some(value => !CONDITIONS.includes(value))) throw new Error("conditions must be unique members of P0,P1,P1F,P2");
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
  const files = ["world/checker.js", "world/checker.pl", "world/temporal-relational-stress/generator.cjs", "world/temporal-relational-stress/collector.cjs", "world/temporal-relational-stress/verify-report.cjs", "world/temporal-relational-stress/analyze-report.cjs", "world/paired-biographies/run.cjs", "world/paired-biographies/harness.cjs", "world/paired-biographies/adapter.py", "world/paired-biographies/transport_guard.py", "world/paired-biographies/runtime_info.py"];
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
    report = { schema_version: "temporal-relational-stress-run-v2", status: "running", boundary: "Synthetic gold event histories and host-supplied checker receipt; no natural-language extraction, autonomous tool choice, real action, or dreams.", fixture: { file: path.relative(ROOT, frozen.file), sha256: frozen.sha256 }, model, config, runtime, selected_cases: cases.map(item => item.case_id), selected_conditions: [...conditions], sources: snapshotSources(output), records: [], summary: null };
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
      try { run = await invokeFn({ system: SYSTEM, user: entry.case.prompts[entry.condition.toLowerCase()], prompt_version: "temporal-relational-stress-v2" }, directory, report.config); }
      catch (error) { run = { status: "failed", error: error.message, final_response: "", inference_calls: 0, tools: [] }; }
    }
    report.records.push({ sequence: entry.sequence, case_id: entry.case.case_id, stratum: entry.case.stratum, condition: entry.condition, order: entry.order, status: run.status, score: score(run, entry.case.oracle), usage: run.usage || null, evidence: path.relative(output, path.join(directory, "adapter.json")), evidence_sha256: run.evidence_sha256 || null, error: run.error || null });
    report.summary = aggregate(report.records, cases, conditions);
    exactWrite(reportFile, report);
    process.stdout.write(`${JSON.stringify({ sequence: entry.sequence, case_id: entry.case.case_id, condition: entry.condition, runtime: run.status, status_correct: report.records.at(-1).score.status_correct, exact: report.records.at(-1).score.exact })}\n`);
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
module.exports = { CONDITIONS, DEFAULT_FIXTURE, EXPECTED_FIXTURE_SHA256, SYSTEM, aggregate, collect, extractStatus, loadFrozenFixture, makePlan, normalizeSupports, options, parseAnswer, runtimeValid, score };
