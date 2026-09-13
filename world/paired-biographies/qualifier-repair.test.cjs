'use strict';

const test=require('node:test');const assert=require('node:assert/strict');
const {prepare,SYSTEM}=require('./qualifier-repair.cjs');

test('qualifier repair selects only p05_b without gold leakage',async()=>{const {selected}=await prepare();assert.equal(selected.length,1);const item=selected[0];assert.equal(item.c.case_id,'p05_b');assert.equal(item.request.system,SYSTEM);assert.deepEqual(item.diagnostics.map(value=>[value.candidate_id,value.field,value.code]),[['itema1','validTo','unsupported_end']]);const text=JSON.stringify(item.request);for(const forbidden of ['expected_extraction_candidates','expected_admission','admission_reason','oracle_rationale','required_proof_items'])assert.ok(!text.includes(forbidden));});

