'use strict';

const test=require('node:test');const assert=require('node:assert/strict');
const {candidateSets,normalizeError,shouldAdmit,summarize}=require('./extracted-memory-e2e.cjs');

test('assisted candidate assembly is exact and admission follows declared source/modality policy',async()=>{const {rows}=await candidateSets();assert.equal(rows.length,24);for(const {c,assisted} of rows)for(const item of assisted){const source=[...c.old_dialogue,...c.current_dialogue].find(value=>value.id===item.source);assert.equal(shouldAdmit(c,item),source.role==='user'&&item.modality==='asserted');}});

test('only nondeterministic SWI stream addresses are normalized',()=>{assert.equal(normalizeError('error(stream(<stream>(0xabc123),1,2))'),'error(stream(<stream>,1,2))');assert.equal(normalizeError('invalid(undeclared((->)/2))'),'invalid(undeclared((->)/2))');});

test('summary keeps status and move surfaces separate',()=>{const base={admission:[],score:{correct:false,status_correct:true,raw_status_correct:true,kind_correct:false,target_correct:false,reason_correct:false},decision:{kind:'pause'},baseline:{query:'q(x)'}},fixed={admission:[{status:'accepted'}],score:{correct:true,status_correct:true,raw_status_correct:true,kind_correct:true,target_correct:true,reason_correct:true},decision:{kind:'act',action:'q(x)'},baseline:{query:'q(x)'}};assert.deepEqual(summarize([{case_id:'x',first:base,assisted:fixed}]),{first:{correct:0,total:1,status_correct:1,move_correct:0,accepted_items:0,runtime_rejections:0},assisted:{correct:1,total:1,status_correct:1,move_correct:1,accepted_items:1,runtime_rejections:0},changed_cases:['x']});});

