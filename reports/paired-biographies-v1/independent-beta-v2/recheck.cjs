'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const p=__dirname,d=JSON.parse(fs.readFileSync(path.join(p,'clean-copy.json'))).root;
const H=require(path.join(d,'world/paired-biographies/harness.cjs')),{check}=require(path.join(d,'world/checker.js')),{simpleChoice}=require(path.join(d,'world/agent.js'));
(async()=>{
 const rows=(await H.loadDataset()).rows,out=[];
 const run={status:'ok',inference_calls:1,physical_dispatches:1,denied_physical_attempts:0,physical_attempts:[{status:'completed'}],provider_terminal_status:'completed',tools:[]};
 const c=rows[0],candidate=c.expected_extraction_candidates.map(({expected_admission,admission_reason,...x})=>x)[0];
 for(const program of ['p u b l i s h(X) :- consent(X).','publish(X Y) :- consent(X Y).','publish(X) : - consent(X).','publish(X) :- consent(Y).','publish(X):-consent(X). consent(lyra).','publish(X):-call(consent(X)).']){
  const s=H.scoreExtraction(c,JSON.stringify({candidates:[{...candidate,program}]}),run);assert.equal(s.exact,false);assert.equal(s.matched,0);assert.equal(s.predicted,1);assert.equal(s.invalid_predicted,1);out.push({test:'original syntax rejected',program,score:s});
 }
 const forms=["publish('a b').","publish('ab').","publish('l\\'yra').","publish('lyra').",'publish(lyra).','publish(Person) :- consent(Person).','publish(X):-consent(X).','publish(X) :- consent(X), consent(_).','publish(X) :- consent(X), consent(X).','publish(X) :- consent(_), consent(_), consent(X).','publish(X) :- consent(Y), consent(Y), consent(X).'];
 const norm=H.canonicalizePrograms(forms,c.domain_projection);assert.ok(norm.every(x=>x.status==='valid'));for(const [a,b] of [[0,1],[2,3],[7,8],[9,10]])assert.notEqual(norm[a].canonical,norm[b].canonical);assert.equal(norm[3].canonical,norm[4].canonical);assert.equal(norm[5].canonical,norm[6].canonical);out.push({test:'quoted atoms and variable sharing preserved',forms,norm});
 const p12=rows.find(c=>c.case_id==='p12_a'),snapshot={ideas:p12.domain_projection,items:p12.accepted_memory};
 const result=await check({snapshot,query:p12.query});const verified={id:'q_verified',literal:'verified(nova)',cost:1},funded={id:'q_funded',literal:'funded(nova)',cost:1};
 assert.equal(simpleChoice(result,[verified]),null);assert.equal(simpleChoice(result,[verified,funded]).id,'q_funded');out.push({test:'all remaining gaps required, tie order',plans:result.plans,one_gap:simpleChoice(result,[verified]),both_gaps:simpleChoice(result,[verified,funded])});
 for(const id of ['p06_b','p07_b','p08_b']){const c=rows.find(c=>c.case_id===id),r=JSON.parse(fs.readFileSync(path.join(p,'offline/memory',id,'memory-check.json')));assert.equal(r.actual.plans[0].rule_ids.length,0);assert.equal(simpleChoice(r.actual,c.decision_policy.questions).literal,c.query);assert.match(H.buildBehavior(c,'structured_no_prolog').system,/unknown query root directly/);out.push({test:'root eligibility',case_id:id,plans:r.actual.plans});}
 const good={...c.expected_next_move,epistemic_status:c.expected_epistemic_status,proof_item_ids:c.required_proof_items,checker_receipt_id:null};
 for(const patch of [{physical_dispatches:2},{denied_physical_attempts:1},{provider_terminal_status:'incomplete'},{physical_attempts:[{status:'stream_error'}]},{physical_attempts:[]}])assert.equal(H.scoreMove(c,'text_memory',JSON.stringify(good),{...run,...patch}).correct,false);
 out.push({test:'invalid physical evidence rejected',count:5});fs.writeFileSync(path.join(p,'recheck.json'),JSON.stringify(out,null,2));console.log('Independent R1/R2/R3 scorer probes passed');
})().catch(e=>{console.error(e);process.exitCode=1});
