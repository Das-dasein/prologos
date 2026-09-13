#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const H = require('./harness.cjs');
const { invoke } = require('./run.cjs');
const { validateQualifiers } = require('./qualifier-validator.cjs');

const ROOT = H.ROOT;
const SOURCE_REPORT = path.join(ROOT, 'reports/paired-biographies-v1/luna-extraction-repair-v2/report.json');
const SOURCE_REPORT_SHA256 = 'e5b7b269119f6a63aa7735680dd29a158bf860593f47a8737b9bfe7e1887d0a8';
const SYSTEM = `Repair only the candidate qualifier fields named by deterministic provenance validation. Return one JSON object with exactly {"candidates":[...]}. Preserve candidate count, order and every candidate field byte-for-byte except the exact fields named in diagnostics. Use the supplied dialogue and extraction contract. An interval endpoint may be copied only when explicitly stated in that candidate's cited source; never infer an old item's validTo from a later replacement because replaces itself retires the old item. Do not change programs, IDs, sources, natural-language renderings, modality, status, or replacement links unless a diagnostic explicitly names that field. Do not add or remove knowledge. This is candidate repair, not admission or truth certification.`;

function loadSource() {
  const bytes = fs.readFileSync(SOURCE_REPORT);
  if (H.sha(bytes) !== SOURCE_REPORT_SHA256) throw new Error('source syntax-repair report hash mismatch');
  const report = JSON.parse(bytes);
  if (report.version !== 'paired-extraction-repair-run-v2' || report.status !== 'completed') throw new Error('unexpected source syntax-repair report');
  return report;
}

function buildRequest(c, repairedCandidates, diagnostics) {
  if (!diagnostics.length) throw new Error('qualifier repair requires diagnostics');
  const payload = { dialogue_and_contract: H.buildExtraction(c).payload, candidates: repairedCandidates, deterministic_qualifier_validation: diagnostics };
  const text = JSON.stringify(payload);
  for (const forbidden of ['expected_extraction_candidates', 'expected_admission', 'admission_reason', 'oracle_rationale', 'required_proof_items']) if (text.includes(forbidden)) throw new Error(`qualifier repair leaked ${forbidden}`);
  return Object.freeze({ prompt_version: 'paired-qualifier-repair-v1', system: SYSTEM, user: text, payload });
}

function runtimeConfig(model) {
  const probe = spawnSync(H.PYTHON, [path.join(__dirname, 'runtime_info.py')], { encoding: 'utf8', timeout: 20000, maxBuffer: 65536, cwd: __dirname });
  if (probe.status !== 0) throw new Error(`cannot pin installed runtime: ${probe.stderr}`);
  const runtime = JSON.parse(probe.stdout);
  return { runtime, config: { runtime_fingerprint: runtime.fingerprint, model, provider: 'openai-codex', reasoning_effort: 'low', max_tokens: 4096, max_iterations: 1, timeout_ms: 120000, retries: 0, fallback: null, tools: [] } };
}

function snapshotSources(out) {
  const files = ['world/checker.js','world/checker.pl','world/paired-biographies/harness.cjs','world/paired-biographies/run.cjs','world/paired-biographies/qualifier-validator.cjs','world/paired-biographies/qualifier-repair.cjs','world/paired-biographies/adapter.py','world/paired-biographies/transport_guard.py','world/paired-biographies/runtime_info.py','world/paired-biographies/canonicalize.pl','world/paired-biographies/schema_validate.py'];
  return files.map(file => { const bytes = fs.readFileSync(path.join(ROOT,file)), destination = path.join(out,'source-snapshot',file); fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,bytes);return {file,sha256:H.sha(bytes),snapshot:path.relative(out,destination)}; });
}

async function prepare() {
  const source = loadSource(), dataset = await H.loadDataset(), selected = [];
  for (const record of source.records) {
    const c = dataset.rows.find(value => value.case_id === record.case_id);
    const diagnostics = validateQualifiers(c, record.repair_score.candidates);
    if (diagnostics.length) selected.push({ c, sourceRecord: record, diagnostics, request: buildRequest(c, record.repair_score.candidates, diagnostics) });
  }
  assert.deepEqual(selected.map(value => value.c.case_id), ['p05_b']);
  return { source, selected };
}

async function main(argv = process.argv.slice(2)) {
  const command = argv[0] || 'offline', outFlag = argv[1], outValue = argv[2];
  if (!['offline','live'].includes(command) || (command === 'live' && (outFlag !== '--out' || !outValue)) || argv.length > (command === 'live' ? 3 : 1)) throw new Error('usage: qualifier-repair.cjs offline | live --out NEW_DIR');
  const { source, selected } = await prepare();
  if (command === 'offline') { const result={status:'ok',source_report_sha256:SOURCE_REPORT_SHA256,repair_cases:selected.map(value=>value.c.case_id),diagnostics:selected.map(value=>value.diagnostics)};console.log(JSON.stringify(result));return result; }
  const out=path.resolve(outValue);if(fs.existsSync(out))throw new Error('output directory must not exist');fs.mkdirSync(path.dirname(out),{recursive:true});fs.mkdirSync(out);
  const {runtime,config}=runtimeConfig(source.config.model);const report={version:'paired-qualifier-repair-run-v1',status:'running',boundary:'One provenance-validator feedback call for syntax-repaired candidates; no gold, admission, behavior or second qualifier repair.',source_report:path.relative(ROOT,SOURCE_REPORT),source_report_sha256:SOURCE_REPORT_SHA256,config,runtime,sources:snapshotSources(out),records:[]};
  const save=()=>fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');save();
  for(const item of selected){let run;try{run=await invoke(item.request,path.join(out,'calls',item.c.case_id),config);}catch(error){run={status:'failed',error:error.message,final_response:'',inference_calls:0,tools:[]};}const repaired=H.scoreExtraction(item.c,run.final_response||'',run);report.records.push({case_id:item.c.case_id,status:run.status,diagnostics:item.diagnostics,source_score:item.sourceRecord.repair_score,repair_score:repaired,usage:run.usage||null,evidence:`calls/${item.c.case_id}/adapter.json`,evidence_sha256:run.evidence_sha256||null});save();console.log(JSON.stringify({case_id:item.c.case_id,status:run.status,exact:repaired.exact,matched:repaired.matched,expected:repaired.expected,invalid:repaired.invalid_predicted}));}
  report.status=report.records.some(value=>value.status!=='ok')?'completed_with_runtime_failures':'completed';report.summary={syntax_repair_combined_exact:23,qualifier_repair_attempted:report.records.length,qualifier_repair_exact:report.records.filter(value=>value.repair_score.exact).length,final_assisted_exact:23+report.records.filter(value=>value.repair_score.exact).length};save();console.log(JSON.stringify({out,status:report.status,summary:report.summary}));if(report.status!=='completed')process.exitCode=1;return report;
}

if(require.main===module)main().catch(error=>{console.error(error.stack||error.message);process.exitCode=1;});
module.exports={SOURCE_REPORT,SOURCE_REPORT_SHA256,SYSTEM,buildRequest,loadSource,prepare};

