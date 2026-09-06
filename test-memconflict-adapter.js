const assert = require("assert").strict;
const fs = require("fs");
const os = require("os");
const path = require("path");
const { adapt } = require("./memconflict-adapter");

function session(id, category, questionId) {
  const conflictType = `${category}_conflict`;
  return {
    Session_ID: id, Date: `2026-02-0${id + 1}`, Session_Type: "conflict_probe", Revealed_Attributes: {},
    Updated_Attributes: category === "dynamic" ? [{ Attribute: "Residence", Before: "north", After: "south" }] : [],
    Static_Conflict_Information: category === "static" ? [{ Conflict_ID: "SC_LOCAL", Role: "Point_B", Target_Field_Path: "Name", Value: "wrong" }] : [],
    Conditional_Conflict_Information: category === "conditional" ? [{ Conflict_ID: "CC_LOCAL", Rule_ID: "CC_LOCAL_R1", Role: "Point_B", Preference_Type: "Drink", Item: "tea", Condition: "when tired" }] : [],
    Others_Dynamic_Information: [], Question_Trigger_Types: [],
    Session_Questions: [{ question_id: questionId, question: `What is the ${category} answer?`, answer: "A locally authored answer.", conflict_type: conflictType, ability_target: "test_target", difficulty: "medium" }],
    Session_Question_Count: 1, Event_Types: [], Session_Outline: "Locally authored outline.",
    Session_Dialogue: { dialogue_turn_1: [{ role: "user", content: `Local ${category} statement.` }, { role: "assistant", content: "Acknowledged." }] },
  };
}
function sourceRecord() { return { ID: "local-persona-1", Fixed_Profile: {}, Dynamic_Profile: {}, Preference_Profile: {}, Personality: {}, Life_Goal: {}, Others_Profile: {}, Full_Session_Chain: [session(0, "dynamic", "Q_D"), session(1, "static", "Q_S"), session(2, "conditional", "Q_C")] }; }
function writeJsonl(file, values) { fs.writeFileSync(file, `${values.map(value => JSON.stringify(value)).join("\n")}\n`, { mode: 0o600 }); }

async function main() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "memconflict-real-intake-test-")); const source = path.join(root, "Step4_4.jsonl"); writeJsonl(source, [sourceRecord()]); const out = path.join(root, "out");
  const first = await adapt({ source, sourceCommit: "local-real-schema-fixture-v1", out });
  assert.deepEqual(first.counts, { personas: 1, sessions: 3, questions: 3, by_conflict_type: { dynamic: 1, static: 1, conditional: 1 } });
  const index = JSON.parse(fs.readFileSync(path.join(out, "index.json"))); assert.equal(index.schema_version, "memconflict-step4_4-source-index-v1"); assert.equal(index.semantics.prose_to_prolog, "not_performed"); assert.equal(index.semantics.oracle, "not_computed"); assert.equal(index.personas[0].persona_id, "local-persona-1");
  const questions = index.personas[0].sessions.flatMap(item => item.questions); assert.deepEqual(questions.map(item => item.category), ["dynamic", "static", "conditional"]); assert.equal(questions[0].formalization.status, "not_formalized"); assert.equal(questions[0].source_turn_coordinates[0].turn_id, "dialogue_turn_1"); assert.match(questions[0].source_turn_coordinates[0].content_sha256, /^[a-f0-9]{64}$/); assert.deepEqual(index.personas[0].sessions[0].conflict_metadata.updated_attributes[0], { Attribute: "Residence", Before: "north", After: "south" }); assert.equal(JSON.parse(fs.readFileSync(path.join(out, "rejection-report.json"))).excluded.length, 0);
  const out2 = path.join(root, "out-2"); await adapt({ source, sourceCommit: "local-real-schema-fixture-v1", out: out2 }); for (const name of ["source-manifest.json", "index.json", "rejection-report.json"]) assert.deepEqual(fs.readFileSync(path.join(out, name)), fs.readFileSync(path.join(out2, name)), `${name} must be deterministic`); await assert.rejects(() => adapt({ source, sourceCommit: "local-real-schema-fixture-v1", out }), /already exists/);
  const malformed = path.join(root, "malformed.jsonl"); fs.writeFileSync(malformed, `${JSON.stringify(sourceRecord())}\n{bad json}\n`); const malformedOut = path.join(root, "malformed-out"); await adapt({ source: malformed, sourceCommit: "local-real-schema-fixture-v1", out: malformedOut }); assert.equal(JSON.parse(fs.readFileSync(path.join(malformedOut, "rejection-report.json"))).excluded[0].reason, "malformed_source");
  const missing = sourceRecord(); delete missing.Full_Session_Chain[0].Session_Dialogue; const missingFile = path.join(root, "missing.jsonl"); writeJsonl(missingFile, [missing]); const missingOut = path.join(root, "missing-out"); await assert.rejects(() => adapt({ source: missingFile, sourceCommit: "local-real-schema-fixture-v1", out: missingOut }), /no eligible records/); await assert.rejects(() => adapt({ source, sourceCommit: "local-real-schema-fixture-v1", out: "relative" }), /absolute/);
  console.log("memconflict-adapter ok: real Step4_4 field names, provenance index, explicit no-Prolog boundary, deterministic and fail-closed checks");
}
main().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
