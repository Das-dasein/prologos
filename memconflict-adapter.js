#!/usr/bin/env node
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const crypto = require("crypto");
const readline = require("readline");
const os = require("os");
const { execFile } = require("child_process");

const CATEGORIES = ["dynamic", "static", "conditional"];
const QUERY_CLASSES = ["direct_recall", "current_state", "conflict", "rule_derived"];
const MAPPING_VERSION = "memconflict-step4_4-mapping-v1";

function sha256Bytes(bytes) { return crypto.createHash("sha256").update(bytes).digest("hex"); }
function sha256File(file) { return sha256Bytes(fs.readFileSync(file)); }
function stable(value) {
  const order = input => Array.isArray(input) ? input.map(order) : input && typeof input === "object" ? Object.fromEntries(Object.keys(input).sort().map(k => [k, order(input[k])])) : input;
  return `${JSON.stringify(order(value), null, 2)}\n`;
}
function fail(code, message) { const e = new Error(message); e.code = code; throw e; }
function text(value, field) { if (typeof value !== "string" || !value.trim()) fail("INELIGIBLE", `${field} must be non-empty text`); return value; }
function absolute(value, field) { const p = text(value, field); if (!path.isAbsolute(p)) fail("ARGS", `${field} must be absolute`); return path.resolve(p); }
function safeAtom(value) {
  const s = text(value, "atom");
  if (!/^[a-z][a-z0-9_]*$/.test(s)) fail("INELIGIBLE", `unsafe Prolog atom: ${s}`);
  return s;
}
function quote(value) {
  const s = text(String(value), "atom");
  if (!/^[A-Za-z0-9][A-Za-z0-9_.:-]*$/.test(s)) fail("INELIGIBLE", `unsafe Prolog atom: ${s}`);
  return `'${s.replace(/'/g, "''")}'`;
}
function arr(value, field) { if (!Array.isArray(value)) fail("INELIGIBLE", `${field} must be an array`); return value; }
function recordCategory(record) {
  const category = record.conflict_type || record.conflict && record.conflict.type;
  if (!CATEGORIES.includes(category)) fail("INELIGIBLE", `${record.record_id || "record"}: unsupported conflict type`);
  return category;
}
function claimFrom(raw, index, record) {
  const c = raw && raw.assertion ? raw.assertion : raw;
  const id = text(c && c.id, `${record.record_id}.claims[${index}].id`);
  const predicate = safeAtom(c.predicate, `${record.record_id}.claims[${index}].predicate`);
  const args = arr(c.args, `${record.record_id}.claims[${index}].args`).map((x, i) => safeAtom(x, `${id}.args[${i}]`));
  const polarity = c.polarity === undefined ? "positive" : text(c.polarity, `${id}.polarity`);
  if (!["positive", "negative"].includes(polarity)) fail("INELIGIBLE", `${id}: polarity must be positive or negative`);
  const value = safeAtom(c.value, `${id}.value`);
  const status = c.status === undefined ? "asserted" : text(c.status, `${id}.status`);
  const sessionId = text(c.session_id, `${id}.session_id`);
  const turnId = text(c.turn_id, `${id}.turn_id`);
  const date = text(c.date, `${id}.date`);
  const span = text(c.source_span, `${id}.source_span`);
  const fieldPath = text(c.field_path, `${id}.field_path`);
  const supersedes = c.supersedes === null || c.supersedes === undefined ? null : text(c.supersedes, `${id}.supersedes`);
  return { id, predicate, args, polarity, value, status, session_id: sessionId, turn_id: turnId, date, source_span: span, field_path: fieldPath, supersedes };
}
function normalize(record, expectedCategory) {
  if (!record || typeof record !== "object" || Array.isArray(record)) fail("INELIGIBLE", "record must be an object");
  const recordId = text(record.record_id, "record_id");
  const category = recordCategory(record);
  if (category !== expectedCategory) fail("INELIGIBLE", `${recordId}: declared category differs from selection`);
  const profileClaims = record.profile && record.profile.claims;
  const timelineClaims = record.timeline && record.timeline.claims;
  const rawClaims = [...(Array.isArray(profileClaims) ? profileClaims : []), ...(Array.isArray(timelineClaims) ? timelineClaims : [])];
  if (!rawClaims.length) fail("INELIGIBLE", `${recordId}: no mapped profile/timeline claims`);
  const claims = rawClaims.map((c, i) => claimFrom(c, i, record));
  const ids = new Set(claims.map(c => c.id));
  for (const c of claims) if (c.supersedes && !ids.has(c.supersedes)) fail("INELIGIBLE", `${recordId}: supersedes target is absent: ${c.supersedes}`);
  const query = record.query;
  if (!query || !QUERY_CLASSES.includes(query.class)) fail("INELIGIBLE", `${recordId}: query.class is not supported`);
  const qPred = safeAtom(query.predicate, `${recordId}.query.predicate`);
  const qArgs = arr(query.args, `${recordId}.query.args`).map((x, i) => safeAtom(x, `${recordId}.query.args[${i}]`));
  const qValue = safeAtom(query.value, `${recordId}.query.value`);
  const rules = Array.isArray(record.rules) ? record.rules.map((r, i) => normalizeRule(r, `${recordId}.rules[${i}]`)) : [];
  if (query.class === "rule_derived" && !rules.length) fail("INELIGIBLE", `${recordId}: rule_derived query has no rule`);
  const gold = record.gold;
  if (!gold || !["entailed", "contradicted", "unknown", "conflict"].includes(gold.label)) fail("INELIGIBLE", `${recordId}: invalid gold.label`);
  return {
    record_id: recordId, category, query: { class: query.class, predicate: qPred, args: qArgs, value: qValue },
    claims, rules, gold: { label: gold.label },
    source_excerpt: { record_id: recordId, sessions: record.sessions || null, dialogue: record.dialogue || null, query, conflict: record.conflict || { type: category } },
  };
}
function normalizeRule(raw, field) {
  if (!raw || typeof raw !== "object") fail("INELIGIBLE", `${field} must be an object`);
  const id = text(raw.id, `${field}.id`);
  const head = raw.head; if (!head) fail("INELIGIBLE", `${field}.head missing`);
  const normalizeAtom = (x, f) => ({ predicate: safeAtom(x.predicate, `${f}.predicate`), args: arr(x.args, `${f}.args`).map((v, i) => safeAtom(v, `${f}.args[${i}]`)), value: safeAtom(x.value, `${f}.value`) });
  return { id, head: normalizeAtom(head, `${field}.head`), body: arr(raw.body, `${field}.body`).map((x, i) => normalizeAtom(x, `${field}.body[${i}]`)) };
}
function term(atom) { return quote(atom); }
function fact(c) { return `claim(${term(c.id)},${term(c.predicate)},[${c.args.map(term).join(",")}],${term(c.polarity)},${term(c.value)},${term(c.status)},${term(c.date)},${term(c.session_id)},${term(c.turn_id)}).`; }
function rule(r) {
  const atom = x => `atom(${term(x.predicate)},[${x.args.map(term).join(",")}],${term(x.value)})`;
  return `declared_rule(${term(r.id)},${atom(r.head)},[${r.body.map(atom).join(",")}]).`;
}
async function runOracle(caseData) {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "memconflict-oracle-"));
  const file = path.join(dir, "oracle.pl");
  const q = caseData.query;
  const program = [
    ":- use_module(library(http/json)).",
    ...caseData.claims.map(fact), ...caseData.claims.filter(c => c.supersedes).map(c => `supersedes(${term(c.id)},${term(c.supersedes)}).`), ...caseData.rules.map(rule),
    "declared_rule(_,_,_) :- fail.",
    "supersedes(_,_) :- fail.",
    "active(C) :- claim(C,_,_,_,_,_,_,_,_), \\+ (supersedes(N,C), claim(N,_,_,_,_,S,_,_,_), S \\= retracted).",
    "atom_holds(atom(P,A,V), C) :- active(C), claim(C,P,A,positive,V,S,_,_,_), S \\= retracted.",
    "atom_holds(atom(P,A,V), rule(R)) :- declared_rule(R,atom(P,A,V),Body), maplist(body_holds,Body).",
    "body_holds(A) :- atom_holds(A,_).",
    "matching(P,A,V,C) :- atom_holds(atom(P,A,V),C).",
    "proof_id(rule(R),I) :- !, atom_concat('rule:',R,I).",
    "proof_id(I,I) :- atom(I).",
    "evidence(P,A,V,Ids) :- findall(I,(matching(P,A,V,C),proof_id(C,I)),Raw), sort(Raw,Ids).",
    "query_conflict(P,A,V) :- matching(P,A,V,_), matching(P,A,Other,_), Other \\= V.",
    `solve(conflict,Ids) :- query_conflict(${term(q.predicate)},[${q.args.map(term).join(",")}],${term(q.value)}), evidence(${term(q.predicate)},[${q.args.map(term).join(",")}],${term(q.value)},Ids), !.`,
    `solve(entailed,Ids) :- matching(${term(q.predicate)},[${q.args.map(term).join(",")}],${term(q.value)},_), evidence(${term(q.predicate)},[${q.args.map(term).join(",")}],${term(q.value)},Ids), !.`,
    `solve(contradicted,Ids) :- atom_value(${term(q.predicate)},[${q.args.map(term).join(",")}],${term(q.value)},Other), matching(${term(q.predicate)},[${q.args.map(term).join(",")}],Other,_), evidence(${term(q.predicate)},[${q.args.map(term).join(",")}],Other,Ids), !.`,
    "solve(unknown,[]).",
    `atom_value(P,A,V,O) :- matching(P,A,V,_), matching(P,A,O,_), O \\= V.`,
    "main :- solve(Label,Proof), findall(C,active(C),Active), json_write_dict(current_output,_{label:Label,proof:Proof,active:Active}), nl.",
  ].join("\n");
  await fsp.writeFile(file, `${program}\n`, { mode: 0o600 });
  try {
    const output = await new Promise((resolve, reject) => execFile("swipl", ["-q", "-s", file, "-g", "main", "-t", "halt"], { timeout: 10000, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => error ? reject(new Error(`SWI oracle failed: ${stderr || error.message}`)) : resolve(stdout)));
    return JSON.parse(output.trim());
  } finally { await fsp.rm(dir, { recursive: true, force: true }); }
}
async function readJsonl(source) {
  const records = new Map();
  const input = fs.createReadStream(source, { encoding: "utf8" });
  const rl = readline.createInterface({ input, crlfDelay: Infinity });
  let line = 0;
  try {
    for await (const raw of rl) { line++; if (!raw.trim()) continue; let value; try { value = JSON.parse(raw); } catch (e) { fail("MALFORMED_SOURCE", `line ${line}: invalid JSONL (${e.message})`); } if (!value.record_id) fail("INELIGIBLE", `line ${line}: missing record_id`); if (records.has(value.record_id)) fail("INELIGIBLE", `duplicate record_id: ${value.record_id}`); records.set(value.record_id, value); }
  } finally { input.destroy(); }
  return records;
}
async function adapt({ source, sourceCommit, selection, out }) {
  source = absolute(source, "--source"); out = absolute(out, "--out"); sourceCommit = text(sourceCommit, "--source-commit");
  if (fs.existsSync(out)) fail("OUT_NOT_FRESH", `--out already exists: ${out}`);
  if (!fs.existsSync(source)) fail("SOURCE_MISSING", `source does not exist: ${source}`);
  const selectionPath = absolute(selection, "--selection");
  const selected = JSON.parse(fs.readFileSync(selectionPath, "utf8"));
  if (selected.schema_version !== "memconflict-selection-v1" || !Array.isArray(selected.records)) fail("INELIGIBLE", "selection schema is invalid");
  if (selected.source_commit && selected.source_commit !== sourceCommit) fail("INELIGIBLE", "selection source_commit does not match --source-commit");
  const byId = new Map(); for (const item of selected.records) { if (!item || typeof item.id !== "string" || !CATEGORIES.includes(item.category)) fail("INELIGIBLE", "invalid selection item"); if (byId.has(item.id)) fail("INELIGIBLE", `duplicate selection id: ${item.id}`); byId.set(item.id, item.category); }
  if (selected.records.length !== 24 || CATEGORIES.some(c => selected.records.filter(x => x.category === c).length !== 8)) fail("INELIGIBLE", "selection must contain eight records per conflict type");
  const sourceMap = await readJsonl(source); const rejection = [];
  for (const id of sourceMap.keys()) if (!byId.has(id)) rejection.push({ record_id: id, reason: "not_selected" });
  const normalized = [];
  for (const [id, category] of byId) { const raw = sourceMap.get(id); if (!raw) { rejection.push({ record_id: id, reason: "selected_id_missing" }); continue; } try { normalized.push(normalize(raw, category)); } catch (e) { rejection.push({ record_id: id, reason: e.code || "ineligible", detail: e.message }); } }
  if (rejection.some(x => x.reason !== "not_selected") || normalized.length !== 24) fail("INELIGIBLE", `selection mapping failed (${rejection.filter(x => x.reason !== "not_selected").length} selected records rejected)`);
  const oracle = [];
  for (const item of normalized) { const result = await runOracle(item); if (result.label !== item.gold.label) fail("ORACLE_MISMATCH", `${item.record_id}: source gold ${item.gold.label}, oracle ${result.label}`); oracle.push({ record_id: item.record_id, query: item.query, answer: result.label, active_claim_ids: result.active, proof_basis: result.proof }); }
  const sourceBytes = fs.readFileSync(source); const selectionBytes = fs.readFileSync(selectionPath);
  const ruleSetSha256 = sha256Bytes(Buffer.from(stable(normalized.flatMap(x => x.rules.map(rule => ({ record_id: x.record_id, ...rule }))))));
  const fixture = { schema_version: "memconflict-local-fixture-v1", mapping_version: MAPPING_VERSION, source_commit: sourceCommit, source_sha256: sha256Bytes(sourceBytes), rule_set_sha256: ruleSetSha256, selected: normalized };
  const oracleFile = { schema_version: "memconflict-oracle-v1", mapping_version: MAPPING_VERSION, source_sha256: fixture.source_sha256, selection_sha256: sha256Bytes(selectionBytes), rule_set_sha256: ruleSetSha256, cases: oracle };
  const manifest = { schema_version: "memconflict-source-manifest-v1", source: { path: source, sha256: fixture.source_sha256, bytes: sourceBytes.length, upstream_commit: sourceCommit, redistribution: "operator_local_only_license_unresolved" }, selection: { path: selectionPath, sha256: sha256Bytes(selectionBytes), records: selected.records.map(x => x.id) }, mapping_version: MAPPING_VERSION, rule_set_sha256: ruleSetSha256, license_gate: { status: "blocked_pending_upstream_terms", source_may_not_be_redistributed: true } };
  const report = { schema_version: "memconflict-rejection-report-v1", source_sha256: fixture.source_sha256, excluded: rejection };
  await fsp.mkdir(out, { recursive: true, mode: 0o700 });
  await Promise.all([["source-manifest.json", manifest], ["fixture.json", fixture], ["oracle.json", oracleFile], ["rejection-report.json", report]].map(async ([name, value]) => fsp.writeFile(path.join(out, name), stable(value), { flag: "wx", mode: 0o600 })));
  return { out, cases: normalized.length, source_sha256: fixture.source_sha256, oracle_sha256: sha256Bytes(Buffer.from(stable(oracleFile))) };
}
function parseArgs(argv) { const a = {}; for (let i = 0; i < argv.length; i++) { const k = argv[i]; if (!["--source", "--source-commit", "--selection", "--out"].includes(k) || !argv[i + 1]) fail("ARGS", "usage: memconflict-adapter.js --source ABS --source-commit REV --selection ABS --out FRESH_ABS"); a[k.slice(2)] = argv[++i]; } if (Object.keys(a).length !== 4) fail("ARGS", "all four arguments are required"); return a; }
module.exports = { adapt, normalize, normalizeRule, readJsonl, runOracle, parseArgs, MAPPING_VERSION };
if (require.main === module) adapt(parseArgs(process.argv.slice(2))).then(result => console.log(JSON.stringify(result))).catch(error => { console.error(`memconflict-adapter: ${error.code || "ERROR"}: ${error.message}`); process.exitCode = 1; });
