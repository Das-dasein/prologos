#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const H = require('./harness.cjs');
const { WorldAgent } = require('../agent');
const { validateQualifiers } = require('./qualifier-validator.cjs');

const ROOT=H.ROOT;
const INPUTS=Object.freeze({
  first:{file:path.join(ROOT,'reports/paired-biographies-v1/luna-full-review-v2/report.json'),sha256:'6a79ca16d43513064049aa12b6af5c35026f86aa4c92d1498e00beecde2689db'},
  syntax:{file:path.join(ROOT,'reports/paired-biographies-v1/luna-extraction-repair-v2/report.json'),sha256:'e5b7b269119f6a63aa7735680dd29a158bf860593f47a8737b9bfe7e1887d0a8'},
  qualifier:{file:path.join(ROOT,'reports/paired-biographies-v1/luna-qualifier-repair-v1/report.json'),sha256:'af2fad2d40beca52b20ce768ed5bce9143b5fce63d6f654146344e52acaca8de'},
});
const validRun={status:'ok',inference_calls:1,provider_terminal_status:'completed',physical_dispatches:1,denied_physical_attempts:0,physical_attempts:[{status:'completed'}],tools:[]};

function loadPinned(input){const bytes=fs.readFileSync(input.file);if(H.sha(bytes)!==input.sha256)throw new Error(`input hash mismatch: ${input.file}`);return JSON.parse(bytes);}

async function candidateSets(){const dataset=await H.loadDataset(),first=loadPinned(INPUTS.first),syntax=loadPinned(INPUTS.syntax),qualifier=loadPinned(INPUTS.qualifier);const syntaxMap=new Map(syntax.records.map(value=>[value.case_id,value.repair_score.candidates])),qualifierMap=new Map(qualifier.records.map(value=>[value.case_id,value.repair_score.candidates]));const rows=[];for(const c of dataset.rows){const original=first.extraction.find(value=>value.case_id===c.case_id).score.candidates;const assisted=qualifierMap.get(c.case_id)||syntaxMap.get(c.case_id)||original;const score=H.scoreExtraction(c,JSON.stringify({candidates:assisted}),validRun);assert.equal(score.exact,true,`${c.case_id}: assisted set must be exact before E2E replay`);assert.deepEqual(validateQualifiers(c,assisted),[],`${c.case_id}: assisted qualifiers`);rows.push({c,first:original,assisted});}return {dataset,rows};}

function shouldAdmit(c,item){const source=[...c.old_dialogue,...c.current_dialogue].find(value=>value.id===item.source);return source?.role==='user'&&item.modality==='asserted';}

function moveTarget(decision,query){return decision.kind==='ask'?decision.question.literal:decision.kind==='act'?decision.action:query;}

async function replay(c,candidates,directory){const agent=new WorldAgent(directory,{agent_id:'extracted_memory_eval',ideas:c.domain_projection,startTime:0}),events=[...c.old_dialogue,...c.current_dialogue].map((message,order)=>({message,order})).sort((a,b)=>a.message.at-b.message.at||a.order-b.order),admission=[];for(const {message} of events){const sourceEvent=agent.observe(message.text,{at:message.at,kind:message.role});for(const item of candidates.filter(value=>value.source===message.id)){let proposalId=null;try{proposalId=agent.propose(sourceEvent,[item],{interpretation:'model-extraction-replay-v1',at:message.at});if(shouldAdmit(c,item)){await agent.admit(proposalId,{admit:true,by:'explicit-user-only-v1',reason:'Deterministic replay policy accepts actual asserted user candidates after trusted validation; no truth certification.'});admission.push({item_id:item.id,status:'accepted',proposal_id:proposalId});}else admission.push({item_id:item.id,status:'retained_candidate',proposal_id:proposalId});}catch(error){admission.push({item_id:item.id,status:'rejected_by_runtime',proposal_id:proposalId,error:error.message});}}}
  const snapshot=agent.snapshot(c.current_time);
  await agent.startGoal({id:'e2e_goal',text:c.current_dialogue.map(value=>value.text).join('\n'),query:c.query,action:c.decision_policy.action,questions:c.decision_policy.questions,budget:c.decision_policy.budget});
  const decision=await agent.step({strategy:'missing'}),baseline=agent.state().goal.reflection.baseline,target=moveTarget(decision,c.query);
  const targetCorrect=decision.kind==='ask'
    ? c.acceptable_questions.some(id=>c.decision_policy.questions.find(value=>value.id===id)?.literal===target)
    : target===c.expected_next_move.semantic_target;
  const score={status_correct:baseline.safe_status===c.expected_epistemic_status,raw_status_correct:baseline.raw_status===c.expected_raw_status,kind_correct:decision.kind===c.expected_next_move.kind,target_correct:targetCorrect,reason_correct:decision.reason===c.expected_next_move.reason||decision.kind==='act'&&c.expected_next_move.reason==='safe_proof'};
  score.correct=Object.values(score).every(Boolean);
  return {case_id:c.case_id,snapshot,admission,baseline,decision,score};
}

function summarize(records){const result={};for(const lane of ['first','assisted']){const rows=records.map(value=>value[lane]);result[lane]={correct:rows.filter(value=>value.score.correct).length,total:rows.length,status_correct:rows.filter(value=>value.score.status_correct&&value.score.raw_status_correct).length,move_correct:rows.filter(value=>value.score.kind_correct&&value.score.target_correct&&value.score.reason_correct).length,accepted_items:rows.reduce((sum,value)=>sum+value.admission.filter(item=>item.status==='accepted').length,0),runtime_rejections:rows.reduce((sum,value)=>sum+value.admission.filter(item=>item.status==='rejected_by_runtime').length,0)};}result.changed_cases=records.filter(value=>value.first.score.correct!==value.assisted.score.correct||value.first.decision.kind!==value.assisted.decision.kind||moveTarget(value.first.decision,value.first.baseline.query)!==moveTarget(value.assisted.decision,value.assisted.baseline.query)).map(value=>value.case_id);return result;}

function snapshotSources(out){const files=['world/agent.js','world/journal.js','world/checker.js','world/checker.pl','world/paired-biographies/harness.cjs','world/paired-biographies/qualifier-validator.cjs','world/paired-biographies/extracted-memory-e2e.cjs'];return files.map(file=>{const bytes=fs.readFileSync(path.join(ROOT,file)),dest=path.join(out,'source-snapshot',file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,bytes);return {file,sha256:H.sha(bytes),snapshot:path.relative(out,dest)};});}

async function run(out){if(fs.existsSync(out))throw new Error('output directory must not exist');fs.mkdirSync(path.dirname(out),{recursive:true});fs.mkdirSync(out);const {dataset,rows}=await candidateSets(),temp=fs.mkdtempSync(path.join(os.tmpdir(),'extracted-memory-e2e-')),records=[];try{for(const row of rows){const first=await replay(row.c,row.first,path.join(temp,row.c.case_id,'first')),assisted=await replay(row.c,row.assisted,path.join(temp,row.c.case_id,'assisted'));records.push({case_id:row.c.case_id,first,assisted});console.log(JSON.stringify({case_id:row.c.case_id,first:first.score.correct,assisted:assisted.score.correct,first_move:first.decision.kind,assisted_move:assisted.decision.kind}));}}finally{fs.rmSync(temp,{recursive:true,force:true});}const report={version:'extracted-memory-e2e-v1',status:'completed',boundary:'Deterministic replay of retained Luna candidate outputs through per-item validation, explicit-user admission, real WorldAgent snapshot/checker and missing-premise policy; no new model calls and no autonomous admission claim.',inputs:INPUTS,dataset_sha256:dataset.dataset_sha256,sources:snapshotSources(out),records,summary:summarize(records)};fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');return report;}

if(require.main===module){const out=process.argv[2];if(!out||process.argv.length!==3){console.error('usage: node world/paired-biographies/extracted-memory-e2e.cjs NEW_OUTPUT_DIR');process.exit(2);}run(path.resolve(out)).then(report=>console.log(JSON.stringify({status:report.status,out:path.resolve(out),summary:report.summary}))).catch(error=>{console.error(error.stack||error.message);process.exitCode=1;});}
module.exports={INPUTS,candidateSets,loadPinned,moveTarget,replay,run,shouldAdmit,summarize};
