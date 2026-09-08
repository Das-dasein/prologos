"use strict";

// One frozen formalization, two independent verdicts, original source question.
// Raw failures stay in the denominator. No model repairs or answer substitution.
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const { spawn, execFileSync } = require("node:child_process");
const { runFreePrologDiagnostic } = require("./free-prolog-diagnostic");
const sha = text => crypto.createHash("sha256").update(text).digest("hex");
const json = value => JSON.stringify(value, null, 2) + "\n";
const write = (file, value) => fs.writeFileSync(file, json(value), { flag: "wx", mode: 0o600 });
const FORM_SCHEMA = { type: "object", additionalProperties: false, required: ["program", "query"], properties: { program: { type: "string" }, query: { type: "string" } } };
const ANSWER_SCHEMA = { type: "object", additionalProperties: false, required: ["answer", "explanation"], properties: { answer: { type: "string", enum: ["A", "B", "C"] }, explanation: { type: "string" } } };

function select(rows, excluded, seed) {
  const picked = ["A", "B", "C"].flatMap(answer => rows.filter(row => row.answer === answer && !excluded.includes(row.id)).sort((a,b) => sha(`${seed}:${a.id}`).localeCompare(sha(`${seed}:${b.id}`))).slice(0,10));
  if (picked.length !== 30 || new Set(picked.map(x => x.id)).size !== 30) throw Error("selection must contain 30 distinct cases");
  return picked.sort((a,b) => a.id-b.id);
}
function inspectEvents(stdout) {
  const events = [], invalid = [];
  for (const line of stdout.split(/\r?\n/).filter(Boolean)) { try { events.push(JSON.parse(line)); } catch { invalid.push(line); } }
  const benignNotice = event => event.item?.type === "error" && event.item.message === "Skill descriptions were shortened to fit the skills context budget. Codex can still see every skill, but some descriptions are shorter. Disable unused skills or plugins to leave more room for the rest.";
  const notices = events.filter(benignNotice);
  const forbidden = events.filter(event => event.item && !["agent_message", "reasoning"].includes(event.item.type) && !benignNotice(event));
  const completed = events.filter(event => event.type === "turn.completed");
  return { no_tool_events: forbidden.length === 0 && invalid.length === 0, forbidden_events: forbidden, benign_notices: notices, invalid_jsonl_lines: invalid, completed_turns: completed.length, usage: completed.at(-1)?.usage || null };
}
async function invoke({ spec, prompt, schema, directory }) {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const receiptFile = path.join(directory, "receipt.json");
  if (fs.existsSync(receiptFile)) return JSON.parse(fs.readFileSync(receiptFile));
  if (fs.existsSync(path.join(directory, "request.json"))) throw Error(`interrupted model call needs explicit disposition: ${directory}`);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "luna-paired-"));
  const schemaFile = path.join(temp,"schema.json"), finalFile = path.join(temp,"final.json");
  fs.writeFileSync(schemaFile,json(schema),{ mode: 0o600 });
  const args = ["exec","--json","--ephemeral","-C",temp,"--skip-git-repo-check","--ignore-user-config","--sandbox","read-only","--model",spec.model,"-c",`model_reasoning_effort="${spec.reasoning_effort}"`,"-c",`model_context_window=${spec.context_window}`,"--output-schema",schemaFile,"--output-last-message",finalFile,"-"];
  write(path.join(directory,"request.json"), { command: spec.codex_path, args, prompt, prompt_sha256: sha(prompt), schema, timeout_ms: spec.model_timeout_ms });
  const started = new Date().toISOString();
  let stdout = "", stderr = "", timedOut = false, code = null, error = null, output = null;
  try {
    const child = spawn(spec.codex_path,args,{ cwd: temp, stdio:["pipe","pipe","pipe"], detached: true });
    const out = fs.createWriteStream(path.join(directory,"stdout.jsonl"),{flags:"wx",mode:0o600});
    const err = fs.createWriteStream(path.join(directory,"stderr.txt"),{flags:"wx",mode:0o600});
    child.stdout.on("data", chunk => {stdout += chunk; out.write(chunk);});
    child.stderr.on("data", chunk => {stderr += chunk; err.write(chunk);});
    code = await new Promise((resolve,reject) => {
      const timer = setTimeout(() => {timedOut=true; try { process.kill(-child.pid,"SIGKILL"); } catch {} },spec.model_timeout_ms);
      child.on("error",e=>{clearTimeout(timer);reject(e);});
      child.on("close",value=>{clearTimeout(timer);resolve(value);});
      child.stdin.on("error",()=>{}); child.stdin.end(prompt);
    }).finally(() => {out.end();err.end();});
    if (fs.existsSync(finalFile)) { const finalText=fs.readFileSync(finalFile,"utf8"); fs.writeFileSync(path.join(directory,"final.txt"),finalText,{flag:"wx",mode:0o600}); output=JSON.parse(finalText); }
    if (timedOut || code !== 0 || !output) error=timedOut ? "model_timeout" : `model_exit_${code}_or_missing_output`;
  } catch(e) {error=String(e.message||e);} finally {fs.rmSync(temp,{recursive:true,force:true});}
  const audit=inspectEvents(stdout);
  if (!audit.no_tool_events || audit.completed_turns !== 1) error ||= "trace_gate_failed";
  if (output && (Object.keys(output).sort().join(",") !== schema.required.slice().sort().join(",") || schema.required.some(k=>typeof output[k]!=="string") || (schema===ANSWER_SCHEMA && !["A","B","C"].includes(output.answer)))) error ||= "output_schema_failed";
  const receipt={started_at:started,finished_at:new Date().toISOString(),exit_code:code,timed_out:timedOut,error,output,audit,stdout_sha256:sha(stdout),stderr_sha256:sha(stderr)};
  write(receiptFile,receipt); return receipt;
}
function formalPrompt(template, item) { return `${template}\n\nWorld:\n${item.context}\n\nOriginal question:\n${item.question}\n`; }
function verdictPrompt(template,item,formal,evidence) { return `${template}\n\nOriginal question:\n${item.question}\n\nModel-authored program:\n${formal.program}\n\nModel-authored query:\n${formal.query}\n\nExecution evidence:\n${evidence}\n`; }
async function evaluateCase({ spec, item, root, formalTemplate, verdictTemplate, invokeModel=invoke, execute=runFreePrologDiagnostic }) {
  const directory=path.join(root,`case-${item.id}`);fs.mkdirSync(directory,{recursive:true,mode:0o700});
  const completed=path.join(directory,"record.json");if(fs.existsSync(completed))return JSON.parse(fs.readFileSync(completed));
  const formal=await invokeModel({spec,prompt:formalPrompt(formalTemplate,item),schema:FORM_SCHEMA,directory:path.join(directory,"formalization")});
  const record={source_id:item.id,source_text_sha256:sha(json(item)),formalization:formal,shared_program_sha256:formal.output?sha(formal.output.program):null,execution:null,conditions:{}};
  if (!formal.error) {
    const executionFile=path.join(directory,"execution.json");
    if(fs.existsSync(executionFile))record.execution=JSON.parse(fs.readFileSync(executionFile));
    else {try {record.execution={observation:await execute({caseId:`luna-thirty-${item.id}`,program:formal.output.program,query:formal.output.query,source:"luna-thirty-formalization",timeoutMs:spec.runtime.timeout_ms,maxOutputBytes:spec.runtime.max_output_bytes}),error:null};}catch(e){record.execution={observation:null,error:String(e.message||e)};}write(executionFile,record.execution);}
    const transcript=record.execution.observation?.runtime.transcript.transcript;
    const executionEvidence=transcript || `Executor unavailable: ${record.execution.error}`;
    const index=spec.selected_source_ids.indexOf(item.id), order=index%2 ? ["M2","M1"] : ["M1","M2"];
    record.condition_order=order;
    for(const condition of order)record.conditions[condition]=await invokeModel({spec,prompt:verdictPrompt(verdictTemplate,item,formal.output,condition==="M2"?executionEvidence:"No executor was run for this condition. Determine the answer by reading the program."),schema:ANSWER_SCHEMA,directory:path.join(directory,condition)});
  }
  write(completed,record);return record;
}
function summarize(records,gold) {
  const summary={planned:30,completed:records.length,formalization_valid:records.filter(r=>!r.formalization.error).length,conditions:{},pairs:{both_correct:0,M1_only_correct:0,M2_only_correct:0,neither_correct:0}};
  for(const condition of ["M1","M2"]) {const valid=records.filter(r=>r.conditions[condition]&&!r.conditions[condition].error),correct=valid.filter(r=>r.conditions[condition].output.answer===gold[r.source_id]);summary.conditions[condition]={valid:valid.length,correct:correct.length,errors_or_missing:records.length-valid.length,accuracy_all_planned:correct.length/30,accuracy_among_valid:valid.length?correct.length/valid.length:null};}
  for(const r of records){const correct=k=>r.conditions[k]&&!r.conditions[k].error&&r.conditions[k].output.answer===gold[r.source_id];const a=correct("M1"),b=correct("M2");summary.pairs[a?(b?"both_correct":"M1_only_correct"):(b?"M2_only_correct":"neither_correct")]++;}
  return summary;
}
async function main(manifestFile,rawRoot) {
  const file=path.resolve(manifestFile),base=path.dirname(file),bytes=fs.readFileSync(file,"utf8"),spec=JSON.parse(bytes);
  if(spec.schema_version!=="luna-thirty-paired-v1"||spec.model!=="gpt-5.6-luna")throw Error("invalid frozen manifest");
  for(const [name,expected]of Object.entries(spec.file_sha256))if(sha(fs.readFileSync(path.resolve(base,name)))!==expected)throw Error(`frozen file changed: ${name}`);
  const cases=JSON.parse(fs.readFileSync(path.join(base,"cases.json"))),gold=JSON.parse(fs.readFileSync(path.join(base,"scorer-only.json")));
  if(JSON.stringify(cases.map(x=>x.id))!==JSON.stringify(spec.selected_source_ids)||cases.length!==30)throw Error("fixture differs from manifest");
  if(cases.some(x=>Object.keys(x).sort().join(",")!=="context,id,question"))throw Error("model fixture contains unexpected fields");
  const root=path.resolve(rawRoot);fs.mkdirSync(root,{recursive:true,mode:0o700});
  const provenance=path.join(root,"provenance.json");
  if(fs.existsSync(provenance)){if(JSON.parse(fs.readFileSync(provenance)).manifest_sha256!==sha(bytes))throw Error("cannot resume changed manifest");}
  else write(provenance,{manifest_file:file,manifest_sha256:sha(bytes),source_commit:execFileSync("git",["rev-parse","HEAD"],{cwd:__dirname,encoding:"utf8"}).trim(),codex_version:execFileSync(spec.codex_path,["--version"],{encoding:"utf8"}).trim(),started_at:new Date().toISOString()});
  const formalTemplate=fs.readFileSync(path.join(base,"formalization.txt"),"utf8"),verdictTemplate=fs.readFileSync(path.join(base,"verdict.txt"),"utf8"),records=[];
  // One case at a time; progress and every stage survive an interrupted collector.
  for(const item of cases){
    if(spec.import_completed_stages_from){
      const sourceCase=path.resolve(base,spec.import_completed_stages_from,`case-${item.id}`),deadline=Date.now()+spec.import_wait_ms;
      while(!fs.existsSync(path.join(sourceCase,"record.json"))){if(Date.now()>deadline)throw Error(`producer not complete: ${sourceCase}`);await new Promise(resolve=>setTimeout(resolve,3000));}
      for(const stage of ["formalization","M1","M2"]){
        const sourceStage=path.join(sourceCase,stage),sourceReceipt=path.join(sourceStage,"receipt.json"),destination=path.join(root,`case-${item.id}`,stage);
        if(!fs.existsSync(sourceReceipt)||fs.existsSync(path.join(destination,"receipt.json")))continue;
        const originalBytes=fs.readFileSync(sourceReceipt,"utf8"),original=JSON.parse(originalBytes),stdout=fs.readFileSync(path.join(sourceStage,"stdout.jsonl"),"utf8"),audit=inspectEvents(stdout);
        const reclassified=original.error==="trace_gate_failed"&&audit.no_tool_events&&audit.completed_turns===1;
        fs.mkdirSync(destination,{recursive:true,mode:0o700});
        for(const name of ["request.json","stdout.jsonl","stderr.txt","final.txt"])if(fs.existsSync(path.join(sourceStage,name)))fs.copyFileSync(path.join(sourceStage,name),path.join(destination,name),fs.constants.COPYFILE_EXCL);
        write(path.join(destination,"receipt.json"),{...original,error:reclassified?null:original.error,audit,imported_from:sourceReceipt,source_receipt_sha256:sha(originalBytes),original_error:original.error,classification_amendment:reclassified?"exact-benign-skills-notice-is-not-a-tool-event":null});
      }
    }
    const record=await evaluateCase({spec,item,root,formalTemplate,verdictTemplate});records.push(record);const summary=summarize(records,gold);fs.writeFileSync(path.join(root,"progress.json"),json(summary));console.log(JSON.stringify({source_id:item.id,completed:records.length,formalization_error:record.formalization.error,M1:record.conditions.M1?.output?.answer,M2:record.conditions.M2?.output?.answer}));}
  const result={status:"completed-diagnostic-not-independent-cdr-review",manifest_sha256:sha(bytes),summary:summarize(records,gold),records:records.map(r=>({source_id:r.source_id,gold:gold[r.source_id],program_sha256:r.shared_program_sha256,formalization_error:r.formalization.error,M1:r.conditions.M1?.output||null,M2:r.conditions.M2?.output||null,M1_error:r.conditions.M1?.error||null,M2_error:r.conditions.M2?.error||null,record:`case-${r.source_id}/record.json`}))};
  const final=path.join(root,"results.json");if(!fs.existsSync(final))write(final,result);console.log(json(result.summary));
}
if(require.main===module)main(process.argv[2],process.argv[3]).catch(e=>{console.error(e.stack||e);process.exitCode=1;});
module.exports={select,inspectEvents,evaluateCase,summarize,FORM_SCHEMA,ANSWER_SCHEMA,sha};
