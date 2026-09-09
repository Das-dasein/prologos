"use strict";
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const source=".cdr/waves/luna-thirty-paired-v1",out=".cdr/waves/luna-thirty-p0-p1-p2-v1";
const ids=[128,336,300,155,292,404],sha=x=>crypto.createHash("sha256").update(x).digest("hex");
const cases=JSON.parse(fs.readFileSync(path.join(source,"cases.json"),"utf8"));
const gold=JSON.parse(fs.readFileSync(path.join(source,"scorer-only.json"),"utf8"));
const byId=new Map(cases.map(x=>[x.id,x]));
const goldById=new Map(Object.entries(gold).map(([id,value])=>[Number(id),value]));
const fixture=[], scorer=[];
for(const id of ids){const original=byId.get(id),record=JSON.parse(fs.readFileSync(path.join(source,"raw-r1-verdicts",`case-${id}`,"record.json"),"utf8"));if(!original||!goldById.has(id))throw Error(`missing:${id}`);const o=record.execution.observation;fixture.push({case_id:`case-${id}`,source_id:id,context:original.context,question:original.question,candidate:{program:o.program,query:o.query,program_sha256:o.program_sha256,query_sha256:o.query_sha256},execution:o});scorer.push({case_id:`case-${id}`,source_id:id,gold:goldById.get(id)});}
fs.writeFileSync(path.join(out,"fixture-draft.json"),JSON.stringify({status:"draft-not-for-model",ids,fixture},null,2)+"\n");
fs.writeFileSync(path.join(out,"scorer-only-draft.json"),JSON.stringify({status:"scorer-only-draft",items:scorer},null,2)+"\n");
console.log(JSON.stringify({ids,fixture_sha256:sha(fs.readFileSync(path.join(out,"fixture-draft.json"),"utf8"))}));
