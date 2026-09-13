#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const H = require('./harness.cjs');
const { invoke } = require('./run.cjs');

const ROOT = H.ROOT;
const SOURCE_REPORT = path.join(ROOT, 'reports/paired-biographies-v1/luna-full-review-v2/report.json');
const SOURCE_REPORT_SHA256 = '6a79ca16d43513064049aa12b6af5c35026f86aa4c92d1498e00beecde2689db';
const SYSTEM = `Repair a previously extracted candidate set after deterministic signed-Horn validation. Return only one JSON object with exactly {"candidates":[...]}. Preserve candidate count, order, IDs and every field byte-for-byte except program on candidates whose supplied validation status is not valid. For those programs, preserve the source meaning and express it as one safe signed-Horn clause: facts are p(a)., rules are head(X) :- body1(X), body2(X)., and explicit negation is neg(literal). Do not use ->, &, negation from absence, directives, builtins, undeclared predicates or extra clauses. Do not add or remove knowledge. This is syntax repair only, not admission or truth certification.`;

function sourceReport() {
  const bytes = fs.readFileSync(SOURCE_REPORT);
  if (H.sha(bytes) !== SOURCE_REPORT_SHA256) throw new Error('source Luna report hash mismatch');
  const report = JSON.parse(bytes);
  if (report.status !== 'completed' || report.config.model !== 'gpt-5.6-luna' || report.extraction.length !== 24) throw new Error('unexpected source report boundary');
  return Object.freeze({ bytes, report });
}

function buildRepair(caseRecord, extractionRecord, sourceEvidence) {
  assert.equal(sourceEvidence.status, 'ok');
  assert.equal(sourceEvidence.final_response, JSON.stringify({ candidates: extractionRecord.score.candidates }));
  const diagnostics = extractionRecord.score.program_validations.map(value => ({ id: value.id, status: value.status, reason: value.reason || null }));
  if (!diagnostics.some(value => value.status !== 'valid')) throw new Error('repair request requires at least one invalid candidate');
  const payload = {
    dialogue_and_contract: H.buildExtraction(caseRecord).payload,
    original_candidates: extractionRecord.score.candidates,
    deterministic_program_validation: diagnostics,
  };
  const serialized = JSON.stringify(payload);
  for (const forbidden of ['expected_extraction_candidates', 'expected_admission', 'admission_reason', 'oracle_rationale', 'required_proof_items']) {
    if (serialized.includes(forbidden)) throw new Error(`repair prompt leaked ${forbidden}`);
  }
  return Object.freeze({ prompt_version: 'paired-extraction-repair-v1', system: SYSTEM, user: serialized, payload });
}

function currentRuntimeConfig(model) {
  const python = H.PYTHON, directory = __dirname;
  const runtimeProbe = spawnSync(python, [path.join(directory, 'runtime_info.py')], { encoding: 'utf8', timeout: 20000, maxBuffer: 65536, cwd: directory });
  if (runtimeProbe.status !== 0) throw new Error(`cannot pin installed runtime: ${runtimeProbe.stderr}`);
  const runtime = JSON.parse(runtimeProbe.stdout);
  return {
    runtime,
    config: { runtime_fingerprint: runtime.fingerprint, model, provider: 'openai-codex', reasoning_effort: 'low', max_tokens: 4096, max_iterations: 1, timeout_ms: 120000, retries: 0, fallback: null, tools: [] },
  };
}

function summarize(records, totalSource = 24) {
  return Object.freeze({
    source_exact: totalSource - records.length,
    source_total: totalSource,
    repair_attempted: records.length,
    repair_exact: records.filter(value => value.repair_score.exact).length,
    combined_exact: totalSource - records.length + records.filter(value => value.repair_score.exact).length,
    invalid_programs_before: records.reduce((sum, value) => sum + value.initial_score.invalid_predicted, 0),
    invalid_programs_after: records.reduce((sum, value) => sum + value.repair_score.invalid_predicted, 0),
    runtime_failures: records.filter(value => value.status !== 'ok').length,
  });
}

function snapshotSources(out) {
  const files = [
    'world/checker.js', 'world/checker.pl', 'world/paired-biographies/harness.cjs',
    'world/paired-biographies/run.cjs', 'world/paired-biographies/extraction-repair.cjs',
    'world/paired-biographies/adapter.py', 'world/paired-biographies/transport_guard.py',
    'world/paired-biographies/runtime_info.py', 'world/paired-biographies/canonicalize.pl',
    'world/paired-biographies/schema_validate.py',
  ];
  return files.map(file => {
    const bytes = fs.readFileSync(path.join(ROOT, file));
    const destination = path.join(out, 'source-snapshot', file);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, bytes);
    return { file, sha256: H.sha(bytes), snapshot: path.relative(out, destination) };
  });
}

async function main(argv = process.argv.slice(2)) {
  const command = argv[0] || 'offline';
  let out = null;
  for (let index = 1; index < argv.length; index += 2) {
    if (argv[index] !== '--out' || !argv[index + 1]) throw new Error('usage: extraction-repair.cjs offline|live [--out NEW_DIR]');
    out = path.resolve(argv[++index]);
  }
  if (!['offline', 'live'].includes(command)) throw new Error('command must be offline or live');
  if (command === 'live' && !out) throw new Error('live requires --out NEW_DIR');
  const { report: source } = sourceReport();
  const dataset = await H.loadDataset();
  const failed = source.extraction.filter(value => !value.score.exact);
  assert.deepEqual(failed.map(value => value.case_id), ['p01_a', 'p01_b', 'p04_a', 'p04_b', 'p05_a', 'p05_b', 'p10_a', 'p12_a']);
  const requests = failed.map(record => {
    const caseRecord = dataset.rows.find(value => value.case_id === record.case_id);
    const evidence = JSON.parse(fs.readFileSync(path.join(path.dirname(SOURCE_REPORT), record.evidence), 'utf8'));
    return { caseRecord, record, request: buildRepair(caseRecord, record, evidence) };
  });
  if (command === 'offline') {
    const result = { status: 'ok', source_report_sha256: SOURCE_REPORT_SHA256, source_exact: 16, repair_candidates: requests.length, invalid_programs: requests.reduce((sum, value) => sum + value.record.score.invalid_predicted, 0) };
    console.log(JSON.stringify(result)); return result;
  }
  if (fs.existsSync(out)) throw new Error('output directory must not exist');
  fs.mkdirSync(path.dirname(out), { recursive: true }); fs.mkdirSync(out);
  const { runtime, config } = currentRuntimeConfig(source.config.model);
  const result = { version: 'paired-extraction-repair-run-v2', status: 'running', boundary: 'One validation-feedback repair call for first-pass invalid extraction cases; original outputs retained; no gold candidates, admission, behavior or second repair.', source_report: path.relative(ROOT, SOURCE_REPORT), source_report_sha256: SOURCE_REPORT_SHA256, dataset_sha256: source.dataset_sha256, config, runtime, sources: snapshotSources(out), records: [], summary: null };
  const save = () => { result.summary = summarize(result.records); fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(result, null, 2) + '\n'); };
  save();
  for (const item of requests) {
    let run;
    try { run = await invoke(item.request, path.join(out, 'calls', item.record.case_id), config); }
    catch (error) { run = { status: 'failed', error: error.message, final_response: '', inference_calls: 0, tools: [] }; }
    const repairScore = H.scoreExtraction(item.caseRecord, run.final_response || '', run);
    result.records.push({ case_id: item.record.case_id, status: run.status, initial_score: item.record.score, repair_score: repairScore, usage: run.usage || null, evidence: `calls/${item.record.case_id}/adapter.json`, evidence_sha256: run.evidence_sha256 || null });
    save(); console.log(JSON.stringify({ case_id: item.record.case_id, status: run.status, exact: repairScore.exact, matched: repairScore.matched, expected: repairScore.expected, invalid: repairScore.invalid_predicted }));
  }
  result.status = result.records.some(value => value.status !== 'ok') ? 'completed_with_runtime_failures' : 'completed';
  save(); console.log(JSON.stringify({ out, status: result.status, summary: result.summary }));
  if (result.status !== 'completed') process.exitCode = 1;
  return result;
}

if (require.main === module) main().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
module.exports = { SOURCE_REPORT, SOURCE_REPORT_SHA256, SYSTEM, buildRepair, snapshotSources, sourceReport, summarize };
