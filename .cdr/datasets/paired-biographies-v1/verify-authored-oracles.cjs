'use strict';
// Research verification of immutable authored constants; never generates gold.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'../../..');
const {WorldAgent,proofFor}=require(path.join(ROOT,'world/agent'));
const {check}=require(path.join(ROOT,'world/checker'));
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const rows=fs.readFileSync(path.join(__dirname,'cases.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
const out=path.join(__dirname,'alpha-verification');
fs.mkdirSync(out,{recursive:true});
const equalSets=(a,b,label)=>assert.deepEqual([...a].sort(),[...b].sort(),label);
const results=[];
(async()=>{
 assert.equal(rows.length,24);
 const grouped=Map.groupBy?Map.groupBy(rows,r=>r.pair_id):rows.reduce((m,r)=>m.set(r.pair_id,[...(m.get(r.pair_id)||[]),r]),new Map());
 assert.equal(grouped.size,12);
 for(const [id,pair] of grouped){
  assert.equal(pair.length,2);equalSets(pair.map(r=>r.variant),['a','b'],id);
  for(const field of ['current_dialogue','current_time','query','domain_projection','decision_policy','admission_policy','category','pair_relation','intervention'])assert.deepEqual(pair[0][field],pair[1][field],id+':'+field);
  assert.notDeepEqual(pair[0].old_dialogue,pair[1].old_dialogue,id+':must change history');
  const outcome=r=>[r.expected_epistemic_status,r.expected_next_move.kind,r.expected_next_move.semantic_target];
  if(pair[0].pair_relation==='invariance')assert.deepEqual(outcome(pair[0]),outcome(pair[1]),id);
  else assert.notDeepEqual(outcome(pair[0]),outcome(pair[1]),id);
 }
 for(const c of rows){
  const dir=path.join(out,c.case_id);
  if(fs.existsSync(dir))fs.rmSync(dir,{recursive:true,force:true});
  const agent=new WorldAgent(dir,{agent_id:'verify_'+c.case_id,ideas:c.domain_projection,startTime:0});
  const messages=[...c.old_dialogue,...c.current_dialogue];
  assert.equal(new Set(messages.map(m=>m.id)).size,messages.length);
  const sourceMap={}, reverse={}, all=[...c.accepted_memory,...c.candidate_memory];
  assert.equal(new Set(all.map(i=>i.id)).size,all.length);
  equalSets(c.expected_extraction_candidates.map(i=>i.id),all.map(i=>i.id),c.case_id+' extraction coverage');
  for(const m of messages){
   sourceMap[m.id]=agent.observe(m.text,{at:m.at,kind:m.role});reverse[sourceMap[m.id]]=m.id;
   const associated=all.filter(i=>i.source===m.id);
   for(const i of associated){
    assert.equal(i.observedAt,m.at);assert.ok(i.validTo===null||i.validTo>=i.validFrom);
    if(i.status==='accepted'){assert.equal(m.role,'user');assert.equal(i.modality,'asserted');assert.equal(i.admittedAt,m.at);}
    else assert.notEqual(i.modality,'asserted');
    if(i.replaces)assert.ok(agent.state().items.some(x=>x.id===i.replaces));
    const p=agent.propose(sourceMap[m.id],[i]);
    if(i.status==='accepted')await agent.admit(p,{admit:true,by:'dataset-alpha-authored-fixture',reason:'Explicitly authored synthetic user assertion; no empirical truth certification.'});
   }
  }
  for(const i of all)assert.ok(sourceMap[i.source],c.case_id+':unresolved source '+i.source);
  const snapshot=agent.snapshot(c.current_time);
  equalSets(snapshot.items.map(i=>i.id),c.expected_active_item_ids,c.case_id+':active');
  equalSets(agent.state().items.map(i=>i.id),c.accepted_memory.map(i=>i.id),c.case_id+':admitted');
  equalSets(Object.values(agent.state().proposals).filter(p=>p.status==='candidate').flatMap(p=>p.items.map(i=>i.id)),c.candidate_memory.map(i=>i.id),c.case_id+':candidates');
  const actual=await check({snapshot,query:c.query});
  assert.equal(actual.status,'ok',c.case_id+':checker status');
  assert.equal(actual.raw_status,c.expected_raw_status,c.case_id+':raw');
  assert.equal(actual.safe_status,c.expected_epistemic_status,c.case_id+':safe');
  const literal=c.expected_epistemic_status==='contradicted'?'neg('+c.query+')':c.query;
  const proof=proofFor(actual,literal);
  equalSets(proof.map(n=>n.item_id),c.required_proof_items,c.case_id+':proof');
  for(const n of [...actual.raw,...actual.safe])assert.ok(reverse[n.source],c.case_id+':checker source resolves');
  await agent.startGoal({id:'verify_goal',text:c.current_dialogue.map(m=>m.text).join('\n'),query:c.query,action:c.decision_policy.action,questions:c.decision_policy.questions,budget:c.decision_policy.budget});
  const decision=await agent.step({strategy:'missing'});
  assert.equal(decision.kind,c.expected_next_move.kind,c.case_id+':move');
  const target=decision.kind==='ask'?decision.question.literal:decision.kind==='act'?decision.action:c.query;
  assert.equal(target,c.expected_next_move.semantic_target,c.case_id+':target');
  if(decision.kind==='ask'){assert.ok(c.acceptable_questions.includes(decision.question.id));assert.equal(decision.question.id,c.expected_next_move.question_id);}
  if(decision.kind==='pause')assert.equal(decision.reason,c.expected_next_move.reason);
  const journal=fs.readFileSync(path.join(dir,'events.jsonl'));
  results.push({case_id:c.case_id,result:'pass',expected:{raw:c.expected_raw_status,safe:c.expected_epistemic_status,move:c.expected_next_move,proof:c.required_proof_items},actual,proof,decision,source_map:sourceMap,active_item_ids:snapshot.items.map(i=>i.id),journal_sha256:sha(journal),journal_path:path.relative(__dirname,path.join(dir,'events.jsonl'))});
 }
 const result={claim_status:'computed',description:'Authored constants agree with actual gold lifecycle/checker/next-step for these 24 synthetic records; not evidence of model or memory improvement.',dataset_sha256:sha(fs.readFileSync(path.join(__dirname,'cases.jsonl'))),checks:results.length,passed:results.length,semantic_discrepancies:[],results};
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({checks:results.length,passed:results.length,semantic_discrepancies:[],results:path.relative(ROOT,path.join(out,'results.json'))}));
})().catch(e=>{fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({error:e.stack,completed:results},null,2)+'\n');console.error(e.stack);process.exitCode=1;});
