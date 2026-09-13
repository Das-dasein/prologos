#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawn,spawnSync}=require('node:child_process');
const H=require('./harness.cjs');
function write(file,data){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');}
function options(argv){const opts={command:argv[0]||'offline',pairs:null,extraction:'none',out:null,model:null};for(let n=1;n<argv.length;n+=2){const k=argv[n];if(!['--pairs','--extraction','--out','--model'].includes(k)||!argv[n+1])throw Error('Usage: run.cjs offline|live [--pairs p01,p02|all] [--extraction none|first|all] [--out NEW_DIRECTORY] [--model MODEL]');opts[k.slice(2)]=argv[n+1];}if(!['offline','live'].includes(opts.command)||!['none','first','all'].includes(opts.extraction))throw Error('Invalid command or extraction selection');return opts;}
async function invoke(request,directory,config) {
 fs.mkdirSync(directory,{recursive:true});const evidencePath=path.join(directory,'adapter.json');
 const input={system:request.system,user:request.user,config,evidence_path:evidencePath};assertInput(input);
 write(path.join(directory,'request.json'),{...input,prompt_version:request.prompt_version,request_sha256:H.sha(input)});
 const processResult=await new Promise(resolve=>{
  const child=spawn(H.PYTHON,[path.join(__dirname,'adapter.py')],{stdio:['pipe','pipe','pipe'],cwd:__dirname});let bytes=0,reason=null,stdout='',stderr='';
  const timer=setTimeout(()=>{reason='timeout';child.kill('SIGKILL');},config.timeout_ms);
  for(const [stream,key] of [[child.stdout,'stdout'],[child.stderr,'stderr']])stream.on('data',b=>{bytes+=b.length;if(bytes>8*1024*1024){reason='output_limit';child.kill('SIGKILL');}else if(key==='stdout')stdout+=b;else stderr+=b;});
  child.on('error',e=>{clearTimeout(timer);resolve({status:'execution_error',error:e.message});});child.stdin.on('error',()=>{});
  child.on('close',(code,signal)=>{clearTimeout(timer);resolve({status:reason||(code===0?'completed':'execution_error'),exit_code:code,signal,stdout,stderr});});child.stdin.end(JSON.stringify(input));
 });
 // Adapter bootstrap logs are deliberately suppressed. Parent process diagnostics contain no credentials.
 write(path.join(directory,'process.json'),processResult);
 let evidence={status:processResult.status,inference_calls:0,tools:[],final_response:''};
 if(fs.existsSync(evidencePath)){try{evidence=JSON.parse(fs.readFileSync(evidencePath,'utf8'));}catch(e){evidence.error=e.message;evidence.status='invalid_evidence';}}
 if(processResult.status!=='completed')evidence.status=processResult.status;
 evidence.evidence_sha256=fs.existsSync(evidencePath)?H.sha(fs.readFileSync(evidencePath)):null;
 return evidence;
}
function assertInput(input){if(Buffer.byteLength(JSON.stringify(input))>256*1024)throw Error('input exceeds 256KiB; no truncation permitted');}
async function main(){
 const opts=options(process.argv.slice(2));const dataset=await H.loadDataset();
 let rows=dataset.rows;
 if(opts.pairs&&opts.pairs!=='all'){const ids=opts.pairs.split(',');for(const id of ids)if(!rows.some(c=>c.pair_id===id))throw Error('Unknown pair: '+id);if(new Set(ids).size!==ids.length)throw Error('duplicate pair');rows=rows.filter(c=>ids.includes(c.pair_id));}
 if(opts.command==='live'&&!opts.pairs)throw Error('Live requires explicit --pairs p01 or --pairs all');
 const out=path.resolve(opts.out||path.join(H.ROOT,'reports/paired-biographies-v1',`${opts.command}-${new Date().toISOString().replace(/[:.]/g,'-')}`));
 if(fs.existsSync(out))throw Error('Output directory already exists; evidence is immutable. Choose a fresh directory.');fs.mkdirSync(out,{recursive:true});
 const configured=spawnSync(H.PYTHON,[path.join(__dirname,'adapter.py'),'--config'],{encoding:'utf8',timeout:20000,maxBuffer:65536});
 if(configured.status!==0)throw Error('Cannot resolve installed Hermes model config: '+configured.stderr);
 const defaults=JSON.parse(configured.stdout);
 const config={model:opts.model||defaults.model,provider:'openai-codex',reasoning_effort:'low',max_tokens:4096,max_iterations:1,timeout_ms:120000,retries:0,fallback:null,tools:[]};
 const provenanceFiles=['world/checker.js','world/checker.pl','world/journal.js','world/agent.js','cognitive-memory.js','world/paired-biographies/harness.cjs','world/paired-biographies/run.cjs','world/paired-biographies/adapter.py','world/paired-biographies/schema_validate.py'];
 const sources=provenanceFiles.map(file=>{const bytes=fs.readFileSync(path.join(H.ROOT,file));const snapshot=path.join('source-snapshot',file);fs.mkdirSync(path.dirname(path.join(out,snapshot)),{recursive:true});fs.writeFileSync(path.join(out,snapshot),bytes);return {file,sha256:H.sha(bytes),snapshot};});
 const report={version:'paired-harness-v1.0.1',status:'running',evaluation:'gold_memory',boundary:'Controlled installed Hermes AIAgent comparison with authored gold memory and host-enforced checker receipt; not spontaneous production provider retrieval/admission/tool choice.',human_review:'pending',dataset_sha256:dataset.dataset_sha256,schema_sha256:dataset.schema_sha256,config,sources,selected_cases:rows.map(c=>c.case_id),memory:[],behavior:[],extraction:[],dream:{status:'not_run',reason:'deferred'},limitations:['AI-authored synthetic development cases; candidate gold, human semantics pending.','Behavior gets retained gold item source messages; full distractor history is tested by extraction only.','Different prompt lengths; same requested settings do not establish equal observed token budgets.','Hermes Codex transport omits requested max_output_tokens: effective token cap is unavailable; wall-time and artifact bytes are bounded.','No extracted-memory end-to-end behavior evaluation in this harness.','Natural-language translation fidelity needs independent semantic review.']};
 const save=()=>{report.summary=H.summarize(rows,report.behavior);write(path.join(out,'report.json'),report);};save();
 for(const c of rows){
  let replay;
  try{replay=await H.replayCase(c,path.join(out,'memory',c.case_id));report.memory.push({case_id:c.case_id,status:'pass',evidence:`memory/${c.case_id}/memory-check.json`});}
  catch(e){report.memory.push({case_id:c.case_id,status:'failed',error:e.stack});save();continue;}
  save();
  if(opts.command==='live')for(const mode of H.MODES){
   let run,score;try{const request=H.buildBehavior(c,mode,replay);run=await invoke(request,path.join(out,'behavior',c.case_id,mode),config);score=H.scoreMove(c,mode,run.final_response||'',run,replay);}
   catch(e){run={status:'failed',error:e.message,inference_calls:0,tools:[]};score={correct:false,failures:[e.message]};}
   report.behavior.push({case_id:c.case_id,mode,status:run.status,score,usage:run.usage||null,evidence:`behavior/${c.case_id}/${mode}/adapter.json`,evidence_sha256:run.evidence_sha256||null});save();console.log(JSON.stringify({case_id:c.case_id,mode,status:run.status,correct:score.correct}));
  }
 }
 if(opts.command==='live'&&opts.extraction!=='none')for(const c of opts.extraction==='first'?rows.slice(0,1):rows){
  let run,score;try{run=await invoke(H.buildExtraction(c),path.join(out,'extraction',c.case_id),config);score=H.scoreExtraction(c,run.final_response||'',run);}catch(e){run={status:'failed'};score={exact:false,status:'failed',failures:[e.message]};}
  report.extraction.push({case_id:c.case_id,status:run.status,score,usage:run.usage||null,evidence:`extraction/${c.case_id}/adapter.json`,evidence_sha256:run.evidence_sha256||null});save();console.log(JSON.stringify({case_id:c.case_id,surface:'extraction',status:run.status,exact:score.exact}));
 }
 report.extraction_summary={status:report.extraction.length?'scored':'not_run',attempted:report.extraction.length,total:rows.length,not_run:rows.length-report.extraction.length,exact:report.extraction.filter(r=>r.score.exact).length};
 report.status=report.memory.some(r=>r.status!=='pass')||report.behavior.some(r=>r.status!=='ok')||report.extraction.some(r=>r.status!=='ok')?'completed_with_failures':'completed';save();
 console.log(JSON.stringify({out,status:report.status,memory_passed:report.memory.filter(r=>r.status==='pass').length,behavior_calls:report.behavior.length,extraction_calls:report.extraction.length,summary:report.summary}));
 if(report.status==='completed_with_failures')process.exitCode=1;
}
if(require.main===module)main().catch(e=>{console.error(e.stack);process.exitCode=1;});
module.exports={invoke,options};
