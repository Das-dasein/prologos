"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {select,inspectEvents,evaluateCase,summarize}=require("./run-luna-thirty-paired");
(async()=>{
  const source=Array.from({length:90},(_,id)=>({id,answer:["A","B","C"][id%3]}));
  const picked=select(source,[0,1,2],"test-seed");assert.equal(picked.length,30);assert.ok(picked.every(x=>x.id>2));assert.deepEqual(picked,select(source,[0,1,2],"test-seed"));
  assert.equal(inspectEvents('{"type":"item.completed","item":{"type":"command_execution"}}\n').no_tool_events,false);
  assert.equal(inspectEvents('malformed\n').no_tool_events,false);
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"luna-paired-test-")),requests=[];
  try {
    const item={id:25,context:"Ada is calm.",question:"Is Ada ready?"},spec={selected_source_ids:[25,30],runtime:{timeout_ms:10,max_output_bytes:500}};
    const invokeModel=async request=>{requests.push(request);return{error:null,output:requests.length===1?{program:"same_program",query:"same_query"}:{answer:requests.length===2?"C":"A",explanation:"fixture"}};};
    const execute=async request=>{assert.equal(request.program,"same_program");return{runtime:{transcript:{transcript:"EXECUTOR_SECRET_EVIDENCE"}}};};
    const record=await evaluateCase({spec,item,root,formalTemplate:"FORM",verdictTemplate:"ANSWER",invokeModel,execute});
    assert.equal(requests.length,3);assert.ok(!requests[1].prompt.includes("EXECUTOR_SECRET_EVIDENCE"));assert.ok(requests[2].prompt.includes("EXECUTOR_SECRET_EVIDENCE"));assert.ok(requests[1].prompt.includes("same_program"));assert.ok(requests[2].prompt.includes("same_program"));assert.equal(record.conditions.M2.output.answer,"A");
    const resumed=await evaluateCase({spec,item,root,formalTemplate:"FORM",verdictTemplate:"ANSWER",invokeModel,execute});assert.deepEqual(resumed,record);assert.equal(requests.length,3);
    const failed=await evaluateCase({spec,item:{...item,id:30},root,formalTemplate:"FORM",verdictTemplate:"ANSWER",invokeModel:async()=>({error:"transport_failed",output:null}),execute:async()=>{throw Error("must not run");}});assert.deepEqual(failed.conditions,{});
    const report=summarize([record,failed],{25:"A",30:"C"});assert.equal(report.conditions.M2.correct,1);assert.equal(report.conditions.M2.accuracy_all_planned,1/30);assert.equal(report.conditions.M1.correct,0);assert.equal(report.pairs.M2_only_correct,1);assert.equal(report.conditions.M2.errors_or_missing,1);
    console.log("luna-thirty-paired ok: stable selection, tool-event rejection, shared program, evidence isolation, LLM-answer scoring, failure denominator and resume");
  }finally{fs.rmSync(root,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
