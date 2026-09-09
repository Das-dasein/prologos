"use strict";
const assert = require("node:assert/strict"), cp = require("node:child_process"), fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const api = require("./near-signature-reflection-run");
const root = fs.mkdtempSync(path.join(os.tmpdir(), "nsr-test-")), fake = path.join(root, "fake.js"), raw = path.join(root, "raw");
fs.writeFileSync(fake, `#!/usr/bin/env node
const fs=require('fs');const a=process.argv, out=a[a.indexOf('--output-last-message')+1], schema=JSON.parse(fs.readFileSync(a[a.indexOf('--output-schema')+1]));
if(process.env.NSR_FAKE==='badjson')fs.writeFileSync(out,'{');else {const m=schema.required.includes('program')?{program:'domain(person,[ada]).\\naxiom(s1,calm(ada)).',query:'calm(ada)'}:{problems:[],boundary:'no finding'};fs.writeFileSync(out,JSON.stringify(m));} console.log(JSON.stringify({type:'turn.completed'}));
`); fs.chmodSync(fake, 0o755);
const protocol = JSON.parse(fs.readFileSync('.cdr/waves/near-signature-reflection-v1/protocol-v1.json')); protocol.codex_path = fake;
const protoFile = '.cdr/waves/near-signature-reflection-v1/protocol-v1.json', original = fs.readFileSync(protoFile,'utf8'); fs.writeFileSync(protoFile, JSON.stringify(protocol));
(async()=>{try { await api.run(raw); const receipts=[]; function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(e.name==='receipt.json')receipts.push(JSON.parse(fs.readFileSync(p)));}}walk(raw);assert.equal(receipts.length,36);assert(receipts.every(r=>r.error===null&&r.audit.completed_turns===1&&r.audit.forbidden.length===0));await assert.rejects(()=>api.run(raw),/no_resume/);process.env.NSR_FAKE='badjson';const bad=api.invoke('x',api.REVIEW_SCHEMA,path.join(root,'bad'),protocol);assert.equal(bad.error,'invalid_final_json');assert(fs.existsSync(path.join(root,'bad','receipt.json')));console.log('near-signature-reflection runner ok: 36 sealed fake calls and failure receipts');}finally{fs.writeFileSync(protoFile,original);fs.rmSync(root,{recursive:true,force:true});}})().catch(e=>{console.error(e);process.exitCode=1});
