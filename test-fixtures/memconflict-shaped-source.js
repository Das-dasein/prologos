// Locally authored schema-shaped data. It is not copied from MemConflict.
const categories = ["dynamic", "static", "conditional"];
const records = [];

for (const category of categories) for (let n = 1; n <= 8; n++) {
  const id = `local-${category}-${String(n).padStart(2, "0")}`;
  const subject = `subject_${category}_${n}`;
  const session = `session_${category}_${n}`;
  const base = { record_id: id, conflict_type: category, sessions: [{ id: session, date: `2026-01-${String(n).padStart(2, "0")}` }], dialogue: [{ id: `${session}-turn-1`, text: `Local authored assertion for ${subject}.` }] };
  if (category === "dynamic") {
    base.timeline = { claims: [
      { id: `${id}-old`, predicate: "status", args: [subject], polarity: "positive", value: "draft", status: "asserted", session_id: session, turn_id: `${session}-turn-1`, date: "2026-01-01", source_span: "turn 1: draft", field_path: "timeline.claims[0]", supersedes: null },
      { id: `${id}-new`, predicate: "status", args: [subject], polarity: "positive", value: "approved", status: "asserted", session_id: session, turn_id: `${session}-turn-2`, date: "2026-01-02", source_span: "turn 2: approved", field_path: "timeline.claims[1]", supersedes: `${id}-old` },
    ] };
    base.query = { class: "current_state", predicate: "status", args: [subject], value: "approved" };
    base.gold = { label: "entailed" };
  } else if (category === "static") {
    base.profile = { claims: [
      { id: `${id}-true`, predicate: "color", args: [subject], polarity: "positive", value: "blue", status: "authoritative", session_id: session, turn_id: `${session}-turn-1`, date: "2026-01-01", source_span: "turn 1: blue", field_path: "profile.claims[0]", supersedes: null },
      { id: `${id}-false`, predicate: "color", args: [subject], polarity: "positive", value: "red", status: "false_conflict", session_id: session, turn_id: `${session}-turn-2`, date: "2026-01-02", source_span: "turn 2: red", field_path: "profile.claims[1]", supersedes: null },
    ] };
    base.conflict = { type: "static", resolution: "authoritative", authoritative_claim_id: `${id}-true`, false_conflict_claim_id: `${id}-false` };
    base.query = { class: "conflict", predicate: "color", args: [subject], value: "blue" };
    base.gold = { label: "conflict" };
  } else {
    base.profile = { claims: [{ id: `${id}-base`, predicate: "mode", args: [subject], polarity: "positive", value: "safe", status: "asserted", session_id: session, turn_id: `${session}-turn-1`, date: "2026-01-01", source_span: "turn 1: safe", field_path: "profile.claims[0]", supersedes: null }] };
    base.rules = [{ id: `${id}-rule`, head: { predicate: "access", args: [subject], value: "allowed" }, body: [{ predicate: "mode", args: [subject], value: "safe" }] }];
    base.query = { class: "rule_derived", predicate: "access", args: [subject], value: "allowed" };
    base.gold = { label: "entailed" };
    base.conflict = { type: "conditional", condition: { predicate: "mode", value: "safe" }, rule_id: `${id}-rule` };
  }
  records.push(base);
}

module.exports = records;
