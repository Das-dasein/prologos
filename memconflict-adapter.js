#!/usr/bin/env node
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const crypto = require("crypto");
const readline = require("readline");

const SOURCE_SCHEMA = "memconflict-step4_4-source-index-v1";
const MAPPING_VERSION = "memconflict-step4_4-intake-v1";
const CATEGORY_BY_SOURCE = Object.freeze({ dynamic_conflict: "dynamic", static_conflict: "static", conditional_conflict: "conditional" });
const ROLES = new Set(["user", "assistant"]);

function fail(code, message) { const error = new Error(message); error.code = code; throw error; }
function nonEmpty(value, field) { if (typeof value !== "string" || !value.trim()) fail("INELIGIBLE", `${field} must be non-empty text`); return value; }
function absolute(value, field) { if (!path.isAbsolute(value)) fail("ARGS", `${field} must be absolute`); return path.resolve(nonEmpty(value, field)); }
function date(value, field) { if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) fail("INELIGIBLE", `${field} must be an ISO date`); return value; }
function array(value, field) { if (!Array.isArray(value)) fail("INELIGIBLE", `${field} must be an array`); return value; }
function object(value, field) { if (!value || typeof value !== "object" || Array.isArray(value)) fail("INELIGIBLE", `${field} must be an object`); return value; }
function sha256(bytes) { return crypto.createHash("sha256").update(bytes).digest("hex"); }
function stable(value) { const sort = input => Array.isArray(input) ? input.map(sort) : input && typeof input === "object" ? Object.fromEntries(Object.keys(input).sort().map(key => [key, sort(input[key])])) : input; return `${JSON.stringify(sort(value), null, 2)}\n`; }

function validateConflictList(value, field, category) {
  return array(value, field).map((item, index) => {
    object(item, `${field}[${index}]`); nonEmpty(item.Conflict_ID, `${field}[${index}].Conflict_ID`);
    if (!["Point_A", "Point_B", "Point_C", "Point_D", "Distractor"].includes(item.Role)) fail("INELIGIBLE", `${field}[${index}].Role is unsupported`);
    if (category === "conditional" && item.Role !== "Distractor") for (const key of ["Rule_ID", "Preference_Type", "Item", "Condition"]) nonEmpty(item[key], `${field}[${index}].${key}`);
    return item;
  });
}
function validateUpdated(value, field) { return array(value, field).map((item, index) => { object(item, `${field}[${index}]`); nonEmpty(item.Attribute, `${field}[${index}].Attribute`); if (!("Before" in item && "After" in item)) fail("INELIGIBLE", `${field}[${index}] must contain Before and After`); return item; }); }
function dialogueIndex(raw, field) {
  object(raw, field);
  return Object.keys(raw).sort((a, b) => Number(a.slice(14)) - Number(b.slice(14))).map(turnId => {
    if (!/^dialogue_turn_\d+$/.test(turnId)) fail("INELIGIBLE", `${field}.${turnId} is not a dialogue turn key`);
    return { turn_id: turnId, messages: array(raw[turnId], `${field}.${turnId}`).map((message, messageIndex) => {
      object(message, `${field}.${turnId}[${messageIndex}]`);
      let role = message.role;
      let content = message.content;
      // The observed release has five assistant messages using
      // {assistant: "content", content: "..."} and nineteen using
      // {assistant: {content: "..."}}. These are explicit source shapes,
      // so normalize them while retaining the original shape marker.
      let sourceShape = "role_content";
      if (!role && Object.prototype.hasOwnProperty.call(message, "assistant")) {
        role = "assistant"; sourceShape = typeof message.assistant === "string" ? "assistant_key_plus_content" : "assistant_object_plus_content";
        if (content === undefined && message.assistant && typeof message.assistant === "object") content = message.assistant.content;
      }
      if (!ROLES.has(role)) fail("INELIGIBLE", `${field}.${turnId}[${messageIndex}].role is unsupported or missing`);
      content = nonEmpty(content, `${field}.${turnId}[${messageIndex}].content`);
      return { message_index: messageIndex, role, content, content_sha256: sha256(Buffer.from(content, "utf8")), source_shape: sourceShape };
    }) };
  });
}
function questionIndex(raw, field, session) {
  object(raw, field); const questionId = nonEmpty(raw.question_id, `${field}.question_id`); const conflictType = nonEmpty(raw.conflict_type, `${field}.conflict_type`); const category = CATEGORY_BY_SOURCE[conflictType];
  if (!category) fail("INELIGIBLE", `${field}.conflict_type is unsupported: ${conflictType}`);
  return { question_id: questionId, question: nonEmpty(raw.question, `${field}.question`), gold_answer: nonEmpty(raw.answer, `${field}.answer`), source_conflict_type: conflictType, category, ability_target: nonEmpty(raw.ability_target, `${field}.ability_target`), difficulty: nonEmpty(raw.difficulty, `${field}.difficulty`), source_path: field, source_turn_coordinates: session.dialogue.flatMap(turn => turn.messages.map(message => ({ turn_id: turn.turn_id, message_index: message.message_index, role: message.role, content_sha256: message.content_sha256 }))), formalization: { status: "not_formalized", reason: "MemConflict prose and metadata are indexed for later reviewed mapping; no Prolog predicate, argument, rule, or oracle is inferred here." } };
}
function sessionIndex(raw, field) {
  object(raw, field); if (!Number.isInteger(raw.Session_ID) || raw.Session_ID < 0) fail("INELIGIBLE", `${field}.Session_ID must be a non-negative integer`);
  const dialogue = dialogueIndex(raw.Session_Dialogue, `${field}.Session_Dialogue`); const questions = array(raw.Session_Questions, `${field}.Session_Questions`);
  const session = { session_id: raw.Session_ID, date: date(raw.Date, `${field}.Date`), session_type: nonEmpty(raw.Session_Type, `${field}.Session_Type`), source_path: field, dialogue, conflict_metadata: { updated_attributes: validateUpdated(raw.Updated_Attributes === undefined ? [] : raw.Updated_Attributes, `${field}.Updated_Attributes`), static: validateConflictList(raw.Static_Conflict_Information, `${field}.Static_Conflict_Information`, "static"), conditional: validateConflictList(raw.Conditional_Conflict_Information, `${field}.Conditional_Conflict_Information`, "conditional"), others_dynamic: array(raw.Others_Dynamic_Information, `${field}.Others_Dynamic_Information`) }, questions: [] };
  session.conflict_metadata.others_dynamic.forEach((item, index) => object(item, `${field}.Others_Dynamic_Information[${index}]`)); session.questions = questions.map((question, index) => questionIndex(question, `${field}.Session_Questions[${index}]`, session));
  if (raw.Session_Question_Count !== undefined && raw.Session_Question_Count !== session.questions.length) fail("INELIGIBLE", `${field}.Session_Question_Count disagrees with Session_Questions`); return session;
}
function personaIndex(raw, line) { object(raw, `line ${line}`); const personaId = nonEmpty(raw.ID, `line ${line}.ID`); const chain = array(raw.Full_Session_Chain, `line ${line}.Full_Session_Chain`); if (!chain.length) fail("INELIGIBLE", `line ${line}.Full_Session_Chain is empty`); return { persona_id: personaId, source_line: line, source_path: `line ${line}`, sessions: chain.map((session, index) => sessionIndex(session, `line ${line}.Full_Session_Chain[${index}]`)) }; }

async function readSource(source) {
  const records = []; const rejected = []; const ids = new Set(); const input = fs.createReadStream(source, { encoding: "utf8" }); const rl = readline.createInterface({ input, crlfDelay: Infinity }); let line = 0;
  try { for await (const raw of rl) {
    line++;
    if (!raw.trim()) { rejected.push({ source_line: line, record_id: null, reason: "malformed_source", detail: "blank JSONL line" }); continue; }
    let parsed;
    try { parsed = JSON.parse(raw); } catch (error) { rejected.push({ source_line: line, record_id: null, reason: "malformed_source", detail: `invalid JSONL (${error.message})` }); continue; }
    const candidateId = parsed && parsed.ID;
    if (ids.has(candidateId)) { rejected.push({ source_line: line, record_id: candidateId || null, reason: "duplicate_id", detail: "duplicate top-level ID" }); continue; }
    try { const indexed = personaIndex(parsed, line); ids.add(indexed.persona_id); records.push(indexed); } catch (error) { rejected.push({ source_line: line, record_id: typeof candidateId === "string" ? candidateId : null, reason: String(error.code || "ineligible").toLowerCase(), detail: error.message }); }
  } } finally { input.destroy(); }
  if (!records.length) fail("INELIGIBLE", "source contains no eligible records"); return { records, rejected };
}
function countIndex(personas) { const counts = { personas: personas.length, sessions: 0, questions: 0, by_conflict_type: { dynamic: 0, static: 0, conditional: 0 } }; for (const persona of personas) for (const session of persona.sessions) { counts.sessions++; for (const question of session.questions) { counts.questions++; counts.by_conflict_type[question.category]++; } } return counts; }

async function adapt({ source, sourceCommit, out }) {
  source = absolute(source, "--source"); out = absolute(out, "--out"); sourceCommit = nonEmpty(sourceCommit, "--source-commit"); if (fs.existsSync(out)) fail("OUT_NOT_FRESH", `--out already exists: ${out}`); if (!fs.existsSync(source)) fail("SOURCE_MISSING", `source does not exist: ${source}`);
  const sourceBytes = fs.readFileSync(source); const sourceSha256 = sha256(sourceBytes); const intake = await readSource(source); const personas = intake.records; const counts = countIndex(personas);
  const index = { schema_version: SOURCE_SCHEMA, mapping_version: MAPPING_VERSION, source: { path: source, sha256: sourceSha256, bytes: sourceBytes.length, upstream_commit: sourceCommit }, counts, semantics: { prose_to_prolog: "not_performed", oracle: "not_computed", note: "This intake binds source identity and provenance only. A reviewed mapping contract must formalize selected questions later." }, personas };
  const manifest = { schema_version: "memconflict-source-manifest-v2", source: { path: source, sha256: sourceSha256, bytes: sourceBytes.length, upstream_commit: sourceCommit, redistribution: "operator_local_only_license_unresolved" }, index_schema: SOURCE_SCHEMA, mapping_version: MAPPING_VERSION, counts, license_gate: { status: "blocked_pending_upstream_terms", source_may_not_be_redistributed: true } };
  const rejection = { schema_version: "memconflict-rejection-report-v2", source_sha256: sourceSha256, excluded: intake.rejected, note: "Ineligible records are excluded from the index with a typed reason; no fields from them are normalized." };
  await fsp.mkdir(out, { recursive: true, mode: 0o700 }); await Promise.all([["source-manifest.json", manifest], ["index.json", index], ["rejection-report.json", rejection]].map(([name, value]) => fsp.writeFile(path.join(out, name), stable(value), { flag: "wx", mode: 0o600 })));
  return { out, source_sha256: sourceSha256, counts, index_sha256: sha256(Buffer.from(stable(index))) };
}
function parseArgs(argv) { const args = {}; for (let i = 0; i < argv.length; i += 2) { const key = argv[i]; if (!["--source", "--source-commit", "--out"].includes(key) || !argv[i + 1]) fail("ARGS", "usage: memconflict-adapter.js --source ABS --source-commit REV --out FRESH_ABS"); const name = key === "--source-commit" ? "sourceCommit" : key.slice(2); args[name] = argv[i + 1]; } if (Object.keys(args).length !== 3) fail("ARGS", "--source, --source-commit and --out are required"); return args; }
module.exports = { adapt, readSource, personaIndex, sessionIndex, questionIndex, parseArgs, MAPPING_VERSION, SOURCE_SCHEMA };
if (require.main === module) adapt(parseArgs(process.argv.slice(2))).then(result => console.log(JSON.stringify(result))).catch(error => { console.error(`memconflict-adapter: ${error.code || "ERROR"}: ${error.message}`); process.exitCode = 1; });
