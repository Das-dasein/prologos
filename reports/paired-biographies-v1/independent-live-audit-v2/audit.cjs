'use strict';
// Independent integrity audit. No model calls, no writes to producer run/source/gold.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const OUT=path.resolve(process.env.PAIRED_AUDIT_OUT||__dirname),ROOT=path.resolve(__dirname,'../../..'),RUN=path.join(ROOT,'reports/paired-biographies-v1/luna-full-review-v2');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const stable=x=>Array.isArray(x)?`[${x.map(stable).join(',')}]`:x&&typeof x==='object'?`{${Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+stable(x[k])).join(',')}}`:JSON.stringify(x);
const eq=(a,b)=>stable(a)===stable(b),unique=a=>new Set(a).size===a.length;
const reasons=['safe_proof','missing_premise','goal_conflicted','goal_contradicted','no_supported_next_action'];
const statuses=['entailed','contradicted','unknown','conflict'];
function shape(raw){
 try{const m=JSON.parse(raw);if(!m||Array.isArray(m)||typeof m!=='object')return {ok:false,error:'not object'};
 const keys=['kind','semantic_target','reason','epistemic_status','proof_item_ids','checker_receipt_id',...(m.kind==='ask'?['question_id']:[])];
 const ok=eq(Object.keys(m).sort(),keys.sort())&&['act','ask','pause'].includes(m.kind)&&typeof m.semantic_target==='string'&&m.semantic_target.length>0&&reasons.includes(m.reason)&&statuses.includes(m.epistemic_status)&&Array.isArray(m.proof_item_ids)&&m.proof_item_ids.every(x=>typeof x==='string')&&unique(m.proof_item_ids)&&(m.checker_receipt_id===null||typeof m.checker_receipt_id==='string')&&(m.kind!=='ask'||typeof m.question_id==='string');return {ok,move:m,error:ok?null:'invalid output shape/type/enum'};
 }catch(e){return {ok:false,error:'invalid JSON'};}
}
function terminal(attempt){
 const bytes=Buffer.concat((attempt?.response_chunks_base64||[]).map(x=>Buffer.from(x,'base64'))),events=[];const errors=[];
 for(const record of bytes.toString('utf8').split(/\r?\n\r?\n/)){
 const data=record.split(/\r?\n/).filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trimStart()).join('\n');if(!data||data==='[DONE]')continue;
 try{events.push(JSON.parse(data));}catch(e){errors.push('incomplete or invalid SSE data record');}
 }
 const terminals=events.filter(e=>['response.completed','response.failed','response.incomplete'].includes(e.type));
 return {bytes:bytes.length,sha256:hash(bytes),events:events.length,parse_errors:errors,terminal_events:terminals.length,response:terminals.at(-1)?.response||null,type:terminals.at(-1)?.type||null,final_text:events.filter(e=>e.type==='response.output_item.done'&&e.item?.type==='message'&&e.item.role==='assistant').flatMap(e=>(e.item.content||[]).filter(c=>c.type==='output_text').map(c=>c.text)).join('\n'),text_done:events.filter(e=>e.type==='response.output_text.done').map(e=>e.text).join('\n')};
}
function fieldStates(obj,names){return Object.fromEntries(names.map(k=>[k,{present:!!obj&&Object.hasOwn(obj,k),value:obj&&Object.hasOwn(obj,k)?obj[k]:null}]));}
function summary(rows,calls,key){const result={};for(const mode of ['no_memory','text_memory','structured_no_prolog','checked_prolog']){
 const selected=calls.filter(x=>x.mode===mode),good=new Set(selected.filter(x=>x.components[key]).map(x=>x.case_id)),pairs=[...new Set(rows.map(x=>x.pair_id))];
 const joint=pairs.filter(p=>rows.filter(x=>x.pair_id===p).every(x=>good.has(x.case_id)));
 result[mode]={correct:rows.filter(x=>good.has(x.case_id)).length,total:rows.length,attempted:selected.length,missing:rows.length-selected.length,pair_joint_correct:joint.length,pair_total:pairs.length,contrast:{correct:joint.filter(p=>rows.find(x=>x.pair_id===p).pair_relation==='contrast').length,total:pairs.filter(p=>rows.find(x=>x.pair_id===p).pair_relation==='contrast').length},invariance:{correct:joint.filter(p=>rows.find(x=>x.pair_id===p).pair_relation==='invariance').length,total:pairs.filter(p=>rows.find(x=>x.pair_id===p).pair_relation==='invariance').length}};
 }return result;}
(async()=>{
 const reportBytes=fs.readFileSync(path.join(RUN,'report.json')),report=JSON.parse(reportBytes),issues=[],check=(ok,why,where)=>{if(!ok)issues.push({where,issue:why});return !!ok;};
 const replayRoot=path.join(OUT,'replay-source');
 for(const s of report.sources){const bytes=fs.readFileSync(path.join(RUN,s.snapshot));check(hash(bytes)===s.sha256,'source snapshot hash mismatch',s.file);const dest=path.join(replayRoot,s.file);fs.mkdirSync(path.dirname(dest),{recursive:true});if(fs.existsSync(dest))assert.equal(hash(fs.readFileSync(dest)),s.sha256,'audit replay source changed');else fs.writeFileSync(dest,bytes,{flag:'wx'});}
 for(const f of ['cases.jsonl','case.schema.json','manifest.json']){const frozen=path.join(__dirname,'replay-source/.cdr/datasets/paired-biographies-v1',f),src=fs.existsSync(frozen)?frozen:path.join(ROOT,'.cdr/datasets/paired-biographies-v1',f),dest=path.join(replayRoot,'.cdr/datasets/paired-biographies-v1',f),bytes=fs.readFileSync(src);fs.mkdirSync(path.dirname(dest),{recursive:true});if(fs.existsSync(dest))assert.equal(hash(fs.readFileSync(dest)),hash(bytes),'dataset source changed');else fs.writeFileSync(dest,bytes,{flag:'wx'});}
 const H=require(path.join(replayRoot,'world/paired-biographies/harness.cjs')),{rows,dataset_sha256,schema_sha256}=await H.loadDataset(),byId=new Map(rows.map(c=>[c.case_id,c]));
 check(dataset_sha256===report.dataset_sha256&&schema_sha256===report.schema_sha256,'dataset/schema hash mismatch','report');
 const {fingerprint,...runtime}=report.runtime;check(H.sha(runtime)===fingerprint&&report.config.runtime_fingerprint===fingerprint,'runtime fingerprint mismatch','report');
 check(report.config.model==='gpt-5.6-luna'&&report.config.reasoning_effort==='low'&&report.config.provider==='openai-codex','unexpected requested model/settings','report');
 const memoryAudit=[];
 for(const e of report.memory){
  const c=byId.get(e.case_id),m=read(path.join(RUN,e.evidence)),j=fs.readFileSync(path.join(RUN,'memory',e.case_id,'events.jsonl')),{sha256:snapshotHash,...snapshotBody}=m.snapshot;
  check(e.status==='pass'&&m.status==='pass','gold replay did not pass',e.case_id);
  check(H.sha(c)===m.case_sha256&&H.sha(j)===m.journal_sha256,'gold case/journal hash mismatch',e.case_id);
  check(H.sha(snapshotBody)===snapshotHash,'gold snapshot hash mismatch',e.case_id);
  check(m.actual.safe_status===c.expected_epistemic_status&&m.actual.raw_status===c.expected_raw_status,'gold status mismatch',e.case_id);
  check(eq(m.proof.map(n=>n.item_id).sort(),[...c.required_proof_items].sort()),'gold proof mismatch',e.case_id);
  const checkerRequest={mode:'query',registry:c.domain_projection.predicates.map(({name,arity})=>({name,arity})),items:m.snapshot.items.map(i=>({id:i.id,source:i.source,program:i.program.trim().endsWith('.')?i.program.trim():i.program.trim()+'.'})),query:c.query.trim().endsWith('.')?c.query.trim():c.query.trim()+'.',import_text:'',seconds:m.actual.evidence.timeoutMs/1000,inferences:m.actual.evidence.inferences,max_facts:m.actual.evidence.maxFacts};
  check(H.sha(checkerRequest)===m.actual.evidence.input_sha256,'gold checker input hash mismatch',e.case_id);
  check(hash(stable(fs.readFileSync(path.join(replayRoot,'world/checker.pl'),'utf8')))===m.actual.evidence.interpreter_sha256,'gold checker interpreter hash mismatch',e.case_id);
  memoryAudit.push({case_id:e.case_id,status:e.status,snapshot_sha256:snapshotHash,journal_sha256:m.journal_sha256,checker_input_sha256:m.actual.evidence.input_sha256});
 }
 const entries=[...report.behavior.map(e=>({...e,lane:'behavior'})),...report.extraction.map(e=>({...e,lane:'extraction',mode:'extraction'}))];
 check(unique(entries.map(e=>e.case_id+'/'+e.mode)),'duplicate case/mode entries','report');const calls=[];
 for(const e of entries){
  const where=e.case_id+'/'+e.mode,c=byId.get(e.case_id),ap=path.join(RUN,e.evidence),dir=path.dirname(ap),req=read(path.join(dir,'request.json')),process=read(path.join(dir,'process.json')),a=read(ap),physical=a.physical_attempts?.[0],body=physical?.request_body||{},wire=a.api_requests?.[0]||{},replay=e.lane==='behavior'?read(path.join(RUN,'memory',e.case_id,'memory-check.json')):null;
  const expected=e.lane==='behavior'?H.buildBehavior(c,e.mode,replay):H.buildExtraction(c),local=[];const test=(ok,msg)=>{if(!ok){issues.push({where,issue:msg});local.push(msg);}return !!ok;};
  test(req.system===expected.system&&req.user===expected.user&&req.prompt_version===expected.prompt_version,'requested input differs from frozen projection');
  test(eq(req.config,report.config)&&eq(a.requested_config,report.config),'call config differs from report');
  test(H.sha({system:req.system,user:req.user,config:req.config,evidence_path:req.evidence_path})===req.request_sha256,'request hash mismatch');
  if(e.evidence_sha256)test(hash(fs.readFileSync(ap))===e.evidence_sha256,'evidence hash mismatch');
  test(eq(a.prompt,{system:req.system,user:req.user}),'adapter prompt mismatch');
  test(eq(a.model_messages,[{role:'system',content:req.system},{role:'user',content:req.user}]),'actual assembled model messages mismatch');
  const wireExact=test(wire.instructions===req.system&&eq(wire.input,[{role:'user',content:req.user}]),'logical wire messages mismatch');
  const physicalExact=test(body.instructions===req.system&&eq(body.input,[{role:'user',content:req.user}]),'physical wire messages mismatch');
  if(physical)test(eq(JSON.parse(physical.request_body_utf8),body),'physical request bytes/body mismatch');
  const toolsOK=test(Array.isArray(a.tools)&&a.tools.length===0&&!wire.tools?.length&&!body.tools?.length,'tool exposure');
  const modelOK=test(wire.model===report.config.model&&body.model===report.config.model&&a.reported_response_model===report.config.model,'wire/response model mismatch');
  test(eq(wire.reasoning,{effort:'low',summary:'auto'})&&eq(body.reasoning,wire.reasoning),'reasoning settings mismatch');
  test(a.runtime_identity?.fingerprint===fingerprint&&eq(a.runtime_identity,report.runtime),'per-call runtime drift');
  const stream=terminal(physical),tr=stream.response,providerFinal=stream.final_text;
  if(a.status==='ok'){
   test(stream.terminal_events===1&&stream.type==='response.completed'&&tr.status==='completed','missing or non-completed physical provider terminal');
   test(stream.parse_errors.length===0,'physical SSE parse error');test(stream.bytes===physical.response_bytes,'physical response bytes mismatch');
   test(tr.model===report.config.model,'physical provider model mismatch');
   test(providerFinal===stream.text_done,'physical item/text completion mismatch');
   test(providerFinal===a.final_response&&a.result?.final_response===a.final_response&&a.api_responses?.[0]?.output_text===a.final_response,'final response differs across physical/API/Hermes layers');
  }
  test(eq(e.usage,a.usage),'report/adapter usage mismatch');if(tr?.usage)test(tr.usage.input_tokens===a.usage.input_tokens&&tr.usage.output_tokens===a.usage.output_tokens,'physical/adapter usage mismatch');
  const runtimeOK=process.status==='completed'&&process.exit_code===0&&a.status==='ok'&&a.inference_calls===1&&a.physical_dispatches===1&&a.denied_physical_attempts===0&&a.physical_attempts?.length===1&&['completed','closed'].includes(physical?.status)&&a.provider_terminal_status==='completed'&&toolsOK&&modelOK&&wireExact&&physicalExact;
  const record={case_id:e.case_id,pair_id:c.pair_id,mode:e.mode,lane:e.lane,status:a.status,process_status:process.status,entry_status:e.status,integrity_issues:local,session_id:a.session_id,pid:a.isolation?.fresh_process_pid,home:a.isolation?.hermes_home,cwd:a.isolation?.cwd,runtime_ok:runtimeOK,physical_dispatches:a.physical_dispatches,denied_physical_attempts:a.denied_physical_attempts,physical_status:physical?.status,provider_terminal:stream.type,physical_response_sha256:stream.sha256,actual_request_sha256:physical?hash(physical.request_body_utf8):null,final_response:a.final_response,usage:a.usage,settings:{requested:{model:report.config.model,reasoning_effort:report.config.reasoning_effort,max_tokens:report.config.max_tokens},wire:fieldStates(body,['model','reasoning','temperature','top_p','max_output_tokens','truncation']),provider_reported:fieldStates(tr,['model','reasoning','temperature','top_p','max_output_tokens','truncation','service_tier'])}};
  if(e.lane==='behavior'){
   const score=H.scoreMove(c,e.mode,a.final_response||'',{...a,status:process.status==='completed'?a.status:process.status},replay);test(score.correct===e.score.correct,'stored/recomputed strict score mismatch');
   const parsed=shape(a.final_response),m=parsed.move,prerequisite=runtimeOK&&parsed.ok,q=m?.kind==='ask'?c.decision_policy.questions.find(q=>q.id===m.question_id):null;
   const move=!!(prerequisite&&m.kind===c.expected_next_move.kind&&(m.kind==='ask'?q&&c.acceptable_questions.includes(q.id)&&m.semantic_target===q.literal:m.semantic_target===c.expected_next_move.semantic_target));
   const proof=!!(prerequisite&&eq([...m.proof_item_ids].sort(),[...c.required_proof_items].sort())&&m.proof_item_ids.every(id=>c.expected_active_item_ids.includes(id)&&c.accepted_memory.some(x=>x.id===id))&&(e.mode!=='no_memory'||m.proof_item_ids.length===0));
   const status=!!(prerequisite&&m.epistemic_status===c.expected_epistemic_status),reason=!!(prerequisite&&m.reason===c.expected_next_move.reason),receipt=!!(prerequisite&&m.checker_receipt_id===(e.mode==='checked_prolog'?expected.payload.checker_receipt.receipt_id:null));
   record.components={strict:score.correct,move,status,proof};record.details={format_ok:parsed.ok,format_error:parsed.error,reason_ok:reason,receipt_ok:receipt,expected_move:c.expected_next_move,expected_status:c.expected_epistemic_status,required_proof_items:c.required_proof_items,move:m||null,strict_failures:score.failures,serialization_observations:prerequisite&&m.kind==='ask'&&q&&c.acceptable_questions.includes(q.id)&&m.semantic_target===q.text&&m.semantic_target!==q.literal?['Declared question ID is correct; target contains the exact declared natural-language question text rather than its required literal. Frozen move metric remains false.']:[],failure_components:[...(!runtimeOK?['runtime']:[]),...(!parsed.ok?['format']:[]),...(prerequisite&&!move?['move']:[]),...(prerequisite&&!status?['status']:[]),...(prerequisite&&!proof?['proof']:[]),...(prerequisite&&!reason?['reason']:[]),...(prerequisite&&!receipt?['receipt']:[])]};
  }else{
   const score=H.scoreExtraction(c,a.final_response||'',{...a,status:process.status==='completed'?a.status:process.status});for(const k of ['exact','matched','expected','predicted','invalid_predicted','precision','recall','status'])test(eq(score[k],e.score[k]),'stored/recomputed extraction '+k+' mismatch');record.extraction_score=score;
  }
  calls.push(record);
 }
 for(const key of ['session_id','pid','home','cwd'])check(unique(calls.map(x=>x[key])),'reused call isolation '+key,'all completed calls');
 const isFinal=report.status!=='running'&&report.behavior.length===96&&report.extraction.length===24;
 const audit={version:'independent-live-audit-v2',status:isFinal?'final':'partial_no_aggregate',producer_status:report.status,report_sha256:hash(reportBytes),report_entries:{behavior:report.behavior.length,extraction:report.extraction.length},dataset_sha256,schema_sha256,runtime_fingerprint:fingerprint,integrity_pass:issues.length===0,issues,memory:memoryAudit,calls,limits:['Synthetic development observations; human gold review pending.','Primary score is strict response accuracy; move/status/proof are diagnostics.','No-memory loses information and is scored against the full-history oracle.','p09 distractor order is seen only by extraction; behavior repeats retained gold input.','Provider-reported settings are metadata, not independent proof of enforcement.','No production retrieval/admission, extracted-memory end-to-end, or dreaming evaluation.']};
 if(isFinal){
  check(report.selected_cases.length===24&&unique(report.selected_cases),'invalid selected case inventory','report');
  audit.summaries=Object.fromEntries(['strict','move','status','proof'].map(k=>[k,summary(rows,calls.filter(x=>x.lane==='behavior'),k)]));
  for(const mode of H.MODES){const a=audit.summaries.strict[mode],b=report.summary[mode];for(const k of ['correct','total','pair_joint_correct','pair_total','contrast','invariance'])check(eq(a[k],b[k]),'stored/recomputed aggregate '+k+' mismatch',mode);}
  const ex=calls.filter(x=>x.lane==='extraction'),sum=k=>ex.reduce((a,x)=>a+(x.extraction_score[k]||0),0);audit.extraction_summary={total:24,attempted:ex.length,not_run:24-ex.length,exact:ex.filter(x=>x.extraction_score.exact).length,matched:sum('matched'),predicted:sum('predicted'),expected:sum('expected'),invalid_predicted:sum('invalid_predicted'),precision:sum('predicted')?sum('matched')/sum('predicted'):null,recall:sum('expected')?sum('matched')/sum('expected'):null};
  audit.usage_summary=Object.fromEntries([...H.MODES,'extraction'].map(mode=>{const selected=calls.filter(c=>c.mode===mode);return [mode,{calls:selected.length,...Object.fromEntries(['input_tokens','output_tokens','reasoning_tokens','cache_read_tokens','total_tokens'].map(k=>[k,selected.reduce((n,c)=>n+(c.usage?.[k]||0),0)])),input_range:selected.length?[Math.min(...selected.map(c=>c.usage?.input_tokens||0)),Math.max(...selected.map(c=>c.usage?.input_tokens||0))]:null,output_range:selected.length?[Math.min(...selected.map(c=>c.usage?.output_tokens||0)),Math.max(...selected.map(c=>c.usage?.output_tokens||0))]:null}]}));
  audit.provider_metadata_summary=Object.fromEntries(['model','reasoning','temperature','top_p','max_output_tokens','truncation','service_tier'].map(k=>{const counts={};for(const c of calls){const x=c.settings.provider_reported[k],label=x.present?stable(x.value):'MISSING';counts[label]=(counts[label]||0)+1;}return [k,counts]}));
  audit.integrity_pass=issues.length===0;fs.writeFileSync(path.join(OUT,'producer-final-report.json'),reportBytes,{flag:'wx'});
 }
 const dest=path.join(OUT,isFinal?'audit-final.json':`audit-partial-${entries.length}.json`);fs.writeFileSync(dest,JSON.stringify(audit,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({artifact:dest,status:audit.status,entries:audit.report_entries,integrity_pass:audit.integrity_pass,issues:issues.slice(0,10),...(isFinal?{summaries:audit.summaries,extraction:audit.extraction_summary}:{})}));
 if(issues.length)process.exitCode=1;
})().catch(e=>{console.error(e.stack);process.exitCode=1});
