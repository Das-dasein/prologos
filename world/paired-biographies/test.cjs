'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const {loadDataset, validateRecords, replayCase, buildBehavior, buildDreamBehavior, buildExtraction, scoreMove, scoreExtraction, summarize, MODES, DREAM_MODE} = require('./harness.cjs');
const clone = x => JSON.parse(JSON.stringify(x));
let rows;
test.before(async () => { rows = (await loadDataset()).rows; });
test('real schema, all pairs and signed-Horn syntax validate', () => assert.equal(rows.length,24));
test('schema rejects unknown fields', async () => {const x=clone(rows);x[0].unexpected=true;await assert.rejects(validateRecords(x), /schema/);});
test('pair context, identity, source, chronology and partition mutations reject', async () => {
 for(const change of [x=>x[1].current_time++, x=>x[0].old_dialogue[0].id='wrong', x=>x[0].accepted_memory[0].observedAt++, x=>x[0].accepted_memory[0].admittedAt=60, x=>x[0].accepted_memory[0].modality='uncertain', x=>x[0].accepted_memory[0].replaces='absent', x=>x[0].expected_active_item_ids.push('absent'), x=>x[0].expected_extraction_candidates[0].program='publish(nova).', x=>x[0].case_id='p02_a']) {
  const x=clone(rows);change(x);await assert.rejects(validateRecords(x));
 }
});
test('forged code, unsafe rule and undeclared predicate reject through SWI', async () => {
 for(const program of ['publish(X) :- consent(Y).','hack(lyra).',':- shell(touch).']) {const x=clone(rows);x[0].accepted_memory[0].program=program;x[0].expected_extraction_candidates[0].program=program;await assert.rejects(validateRecords(x));}
});
test('whitelist excludes evaluator fields and text/formal qualifiers agree for all cases', () => {
 for(const c of rows) {
  const a=buildBehavior(c,'text_memory'), b=buildBehavior(c,'structured_no_prolog');
  for(const req of [a,b,buildBehavior(c,'no_memory'),buildExtraction(c)]) {
   const s=JSON.stringify(req);for(const secret of ['expected_admission','oracle_rationale','required_proof_items',c.case_id,c.pair_id+'-domain',c.category])assert.ok(!s.includes(secret),secret);
  }
  assert.deepEqual(a.payload.memory.map(({content,...m})=>m),b.payload.memory.map(({content,...m})=>m));
  assert.ok(!JSON.stringify(a.payload.memory).includes(':-'));
  assert.equal(buildBehavior(c,'no_memory').payload.memory,undefined);
 }
});
test('real lifecycle across all 24 records, no cross-case store reuse', async () => {
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'paired-test-'));
 try {for(const c of rows) {const r=await replayCase(c,path.join(dir,c.case_id));assert.equal(r.status,'pass');assert.throws(()=>buildBehavior(c,'checked_prolog'));const req=buildBehavior(c,'checked_prolog',r);assert.ok(req.payload.checker_receipt);assert.throws(()=>buildBehavior(rows.find(x=>x.case_id!==c.case_id),'checked_prolog',r));}} finally {fs.rmSync(dir,{recursive:true,force:true});}
});
test('v2 shortest-plan corpus is separately pinned and replays all 26 records', async () => {
 const directory=path.join(__dirname,'../../.cdr/datasets/paired-biographies-v2');const dataset=await loadDataset(directory);
 assert.equal(dataset.manifest.dataset_id,'paired-biographies-v2');assert.equal(dataset.rows.length,26);assert.equal(dataset.manifest.pairs,13);
 const [a,b]=dataset.rows.filter(c=>c.pair_id==='p13');assert.equal(a.decision_policy.version,'signed-horn-next-move-v2');
 assert.equal(buildBehavior(b,'structured_no_prolog').system.includes('fewest missing literals'),true);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'paired-v2-test-'));
 try {for(const c of dataset.rows) {const replay=await replayCase(c,path.join(dir,c.case_id));assert.equal(replay.status,'pass');}
  assert.equal((await replayCase(a,path.join(dir,'p13_a_fresh'))).decision.question.literal,'p(orion)');
  assert.equal((await replayCase(b,path.join(dir,'p13_b_fresh'))).decision.question.literal,'q(orion)');
 } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
test('dream condition is limited to authored eligible cases and exposes conditional evidence without a decision', async () => {
 const eligible=rows.filter(c=>c.dream_eligibility.eligible);assert.deepEqual(eligible.map(c=>c.case_id),['p01_a','p05_b','p06_b','p07_b','p08_b']);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'paired-dream-'));
 try {for(const c of eligible) {
  const replay=await replayCase(c,path.join(dir,c.case_id),{strategy:'dream'}), request=buildDreamBehavior(c,replay), text=JSON.stringify(request.payload);
  assert.equal(request.prompt_version,'paired-dream-behavior-v1');assert.equal(request.payload.dream_receipt.baseline.safe_status,'unknown');
  assert.ok(request.payload.dream_receipt.questions.every(q=>q.disposition==='decision_relevant'));
  assert.equal('decision' in request.payload.dream_receipt,false);assert.ok(!text.includes('oracle_rationale'));assert.ok(!text.includes('required_proof_items'));
  const move={...c.expected_next_move,epistemic_status:c.expected_epistemic_status,proof_item_ids:[],checker_receipt_id:request.payload.checker_receipt.receipt_id};
  assert.equal(scoreMove(c,DREAM_MODE,JSON.stringify(move),{status:'ok',inference_calls:1,provider_terminal_status:'completed',physical_dispatches:1,denied_physical_attempts:0,physical_attempts:[{status:'completed'}],tools:[]},replay).correct,true);
 }} finally {fs.rmSync(dir,{recursive:true,force:true});}
 assert.throws(()=>buildDreamBehavior(rows.find(c=>!c.dream_eligibility.eligible),{}),/explicitly eligible/);
});
test('temporal, candidate admission, absence negation and forged proof oracle mutations fail replay',async()=>{
 for(const [id,mutate] of [['p06_b',c=>c.expected_active_item_ids.push('f_window')],['p07_b',c=>{c.expected_epistemic_status='entailed';}],['p01_a',c=>c.expected_epistemic_status='contradicted'],['p01_b',c=>c.required_proof_items=['r_consent']],['p05_b',c=>c.expected_active_item_ids.push(c.accepted_memory[0].id)]]) {
  const c=clone(rows.find(x=>x.case_id===id));mutate(c);const d=fs.mkdtempSync(path.join(os.tmpdir(),'mutation-'));try {await assert.rejects(replayCase(c,d));}finally{fs.rmSync(d,{recursive:true,force:true});}
 }
});
test('move scorer rejects malformed, wrong target, invented proof, missing checked call, failed runtime', () => {
 const c=rows[1], good={...c.expected_next_move,epistemic_status:c.expected_epistemic_status,proof_item_ids:c.required_proof_items,checker_receipt_id:null};
 const run={status:'ok',inference_calls:1,provider_terminal_status:'completed',physical_dispatches:1,denied_physical_attempts:0,physical_attempts:[{status:'completed'}],tools:[]};assert.equal(scoreMove(c,'structured_no_prolog',JSON.stringify(good),run).correct,true);
 for(const bad of [{...good,semantic_target:'publish(other)'},{...good,proof_item_ids:['made_up']},{...good,proof_item_ids:[]},{...good,extra:'oracle'}, {...good,epistemic_status:'unknown'}]) assert.equal(scoreMove(c,'structured_no_prolog',JSON.stringify(bad),run).correct,false);
 assert.equal(scoreMove(c,'structured_no_prolog','```json\n'+JSON.stringify(good)+'\n```',run).correct,false);
 assert.equal(scoreMove(c,'checked_prolog',JSON.stringify(good),run).correct,false);
 assert.equal(scoreMove(c,'structured_no_prolog',JSON.stringify(good),{...run,status:'timeout'}).correct,false);
 const q=rows[0], move={...q.expected_next_move,epistemic_status:'unknown',proof_item_ids:[],checker_receipt_id:null};
 assert.equal(scoreMove(q,'text_memory',JSON.stringify({...move,question_id:'q_forged'}),run).correct,false);
});
test('extraction is separately scored; arbitrary generated ids allowed but forgeries and false negatives fail', () => {
 const c=rows[0];const candidates=c.expected_extraction_candidates.map(({expected_admission,admission_reason,...i})=>({...i,id:'item_1'}));
 assert.equal(scoreExtraction(c,JSON.stringify({candidates}),{status:'ok',inference_calls:1,provider_terminal_status:'completed',physical_dispatches:1,denied_physical_attempts:0,physical_attempts:[{status:'completed'}],tools:[]}).exact,true);
 assert.equal(scoreExtraction(c,JSON.stringify({candidates:[]}),{status:'ok',inference_calls:1,provider_terminal_status:'completed',physical_dispatches:1,denied_physical_attempts:0,physical_attempts:[{status:'completed'}],tools:[]}).exact,false);
 candidates[0].source='forged';assert.equal(scoreExtraction(c,JSON.stringify({candidates}),{status:'ok',inference_calls:1,provider_terminal_status:'completed',physical_dispatches:1,denied_physical_attempts:0,physical_attempts:[{status:'completed'}],tools:[]}).exact,false);
});
test('not-run and failures stay in pair denominator; empty results never success', () => {
 const r=summarize(rows,[]);for(const m of MODES){assert.equal(r[m].correct,0);assert.equal(r[m].total,24);assert.equal(r[m].pair_joint_correct,0);assert.equal(r[m].pair_total,12);}
});
test('manifest byte/hash mismatch rejects before any model call', async () => {
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'manifest-'));try{
  for(const file of ['manifest.json','case.schema.json','cases.jsonl'])fs.copyFileSync(path.join(__dirname,'../../.cdr/datasets/paired-biographies-v1',file),path.join(dir,file));
  fs.appendFileSync(path.join(dir,'cases.jsonl'),'\n');await assert.rejects(loadDataset(dir),/hash mismatch/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('anonymous variables do not normalize into a shared bound variable',()=>{
 const {normalizeProgram}=require('./harness.cjs');assert.throws(()=>normalizeProgram('publish(_) :- consent(_).',rows[0].domain_projection));
});
test('CLI supports explicitly separate model choices and rejects unknown flags',()=>{
 const {options}=require('./run.cjs');for(const model of ['gpt-5.6-luna','gpt-5.6-terra','gpt-5.6-sol'])assert.equal(options(['live','--pairs','p01','--model',model]).model,model);
 assert.equal(options(['live','--pairs','p01','--dream','eligible']).dream,'eligible');assert.equal(options(['live','--pairs','p01','--behavior','none']).behavior,'none');assert.throws(()=>options(['live','--dream','all']));
 assert.equal(options(['offline','--dataset','/tmp/paired-biographies-v2']).dataset,'/tmp/paired-biographies-v2');
 assert.throws(()=>options(['live','--oracle','yes']));
});
test('R1 actual root and rule-chain plans agree with the versioned question instructions',async()=>{
 const {check}=require('../checker');
 for(const id of ['p06_b','p07_b','p08_b','p01_a']){
  const c=rows.find(c=>c.case_id===id),snapshot={ideas:c.domain_projection,items:c.accepted_memory.filter(i=>c.expected_active_item_ids.includes(i.id))};
  const r=await check({snapshot,query:c.query});assert.equal(r.safe_status,'unknown');
  const eligible=c.decision_policy.questions.filter(q=>q.cost<=c.decision_policy.budget.maxQuestionCost);
  const plans=r.plans.filter(p=>p.missing.length&&p.missing.every(l=>eligible.some(q=>q.literal===l||`neg(${q.literal})`===l)));
  assert.ok(plans.some(p=>p.missing.includes(c.expected_next_move.semantic_target)));
  if(id!=='p01_a')assert.ok(plans.some(p=>p.rule_ids.length===0&&p.missing.includes(c.query)));
  const request=buildBehavior(c,'structured_no_prolog');assert.equal(request.prompt_version,'paired-behavior-v2');
  assert.ok(request.system.includes('asking the unknown query root directly'));
  assert.ok(request.system.includes('every remaining gap is covered'));
  assert.ok(!request.system.includes('only if they fill missing premises on a stated rule path'));
 }
});
test('R2 original syntax cannot be repaired into a perfect extraction score',()=>{
 const c=rows[0],run={status:'ok',inference_calls:1,provider_terminal_status:'completed',physical_dispatches:1,denied_physical_attempts:0,physical_attempts:[{status:'completed'}],tools:[]};
 for(const program of ['p u b l i s h(X) :- consent(X).','publish(X Y) :- consent(X Y).','publish(X) : - consent(X).','publish(X) :- consent(Y).','publish(_) :- consent(_).','publish(X) :- consent(X). consent(lyra).',"publish('X') :- consent(X).",'publish(X) -> consent(X).','undeclared(lyra).']){
  const candidates=c.expected_extraction_candidates.map(({expected_admission,admission_reason,...i})=>({...i,program}));
  const score=scoreExtraction(c,JSON.stringify({candidates}),run);assert.equal(score.exact,false,program);assert.equal(score.matched,0,program);assert.equal(score.predicted,1);
 }
 const {canonicalizePrograms}=require('./harness.cjs');
 const result=canonicalizePrograms(["publish('a b').","publish('ab').","publish(lyra).","publish('lyra').",'publish(Person) :- consent( Person ).','publish(X):-consent(X).','publish(X) :- consent(_), consent(X).','publish(X) :- consent(Y), consent(X).'],c.domain_projection);
 assert.notEqual(result[0].canonical,result[1].canonical);assert.equal(result[2].canonical,result[3].canonical);assert.equal(result[4].canonical,result[5].canonical);assert.equal(result[6].canonical,result[7].canonical);
 assert.ok(result.every(r=>r.status==='valid'));
});
test('R3 old method-entry-only evidence and retried physical evidence cannot earn credit',()=>{
 const c=rows[0],move={...c.expected_next_move,epistemic_status:'unknown',proof_item_ids:[],checker_receipt_id:null};
 for(const run of [{status:'ok',inference_calls:1,tools:[]},{status:'ok',inference_calls:1,physical_dispatches:2,denied_physical_attempts:0,physical_attempts:[{status:'completed'},{status:'completed'}],tools:[]}])assert.equal(scoreMove(c,'text_memory',JSON.stringify(move),run).correct,false);
});
test('R1 unaskable unknown, explicit contradiction and raw conflict do not produce an eligible question',async()=>{
 const {check}=require('../checker');
 for(const [id,safe,raw] of [['p12_a','unknown','unknown'],['p02_b','contradicted','contradicted'],['p03_b','unknown','conflict']]){
  const c=rows.find(c=>c.case_id===id),snapshot={ideas:c.domain_projection,items:c.accepted_memory.filter(i=>c.expected_active_item_ids.includes(i.id))};
  const r=await check({snapshot,query:c.query});assert.equal(r.safe_status,safe);assert.equal(r.raw_status,raw);assert.equal(c.expected_next_move.kind,'pause');
  const qs=c.decision_policy.questions.filter(q=>q.cost<=c.decision_policy.budget.maxQuestionCost);
  const supported=r.plans.filter(p=>p.missing.length&&p.missing.every(l=>qs.some(q=>q.literal===l||`neg(${q.literal})`===l)));
  assert.equal(supported.length,0);
 }
});
