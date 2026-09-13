'use strict';
const fs=require('fs'),path=require('path');
const info=JSON.parse(fs.readFileSync(path.join(__dirname,'clean-copy.json')));
const H=require(path.join(info.clean_root,'world/paired-biographies/harness.cjs'));
const {check}=require(path.join(info.clean_root,'world/checker.js'));
(async()=>{
 const {rows}=await H.loadDataset(),run={status:'ok',inference_calls:1,tools:[]},out=[];
 const c=rows[0];
 const gold=()=>c.expected_extraction_candidates.map(({expected_admission,admission_reason,...x})=>x);
 for(const program of ['p u b l i s h(X) :- consent(X).','publish(X Y) :- consent(X Y).','publish(X) : - consent(X).']){
  const candidates=gold();candidates[0].program=program;
  const score=H.scoreExtraction(c,JSON.stringify({candidates}),run);
  const checked=await check({snapshot:{ideas:c.domain_projection,items:candidates},query:c.query,mode:'validate'});
  out.push({test:'malformed extraction lexical collision',program,score,checker:checked});
 }
 for(const id of ['p06_b','p07_b','p08_b']){
  const d=rows.find(c=>c.case_id===id),r=JSON.parse(fs.readFileSync(path.join(__dirname,'offline/memory',id,'memory-check.json')));
  out.push({test:'root question without rule',case_id:id,prompt:H.buildBehavior(d,'structured_no_prolog').system,active:r.snapshot.items,plans:r.actual.plans,expected:d.expected_next_move});
 }
 for(const c of rows){
  const good={...c.expected_next_move,epistemic_status:c.expected_epistemic_status,proof_item_ids:c.required_proof_items,checker_receipt_id:null};
  for(const [name,change] of [ ['wrong target',m=>m.semantic_target='wrong'],['extra field',m=>m.injected='x'],['forged proof',m=>m.proof_item_ids=['forged']],['wrong status',m=>m.epistemic_status='invalid'],['missing proof field',m=>delete m.proof_item_ids] ]){
   const m=structuredClone(good);change(m);const score=H.scoreMove(c,'structured_no_prolog',JSON.stringify(m),run);out.push({test:name,case_id:c.case_id,rejected:!score.correct});
  }
  for(const status of ['timeout','execution_error','failed'])out.push({test:'runtime '+status,case_id:c.case_id,rejected:!H.scoreMove(c,'structured_no_prolog',JSON.stringify(good),{...run,status}).correct});
 }
 for(const mode of H.MODES)out.push({test:'empty denominator '+mode,result:H.summarize([],[])[mode]});
 const p09=rows.filter(x=>x.pair_id==='p09');
 for(const mode of ['no_memory','text_memory','structured_no_prolog'])out.push({test:'p09 identical behavioral input',mode,identical:H.buildBehavior(p09[0],mode).user===H.buildBehavior(p09[1],mode).user});
 fs.writeFileSync(path.join(__dirname,'probes.json'),JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out.filter(x=>!x.rejected),null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
