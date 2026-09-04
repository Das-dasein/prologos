"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");

const ATOM = /^[a-z][a-z0-9_]*$/;
const DECISIONS = new Set(["write", "ignore", "clarify"]);
const MODALITIES = new Set(["asserted", "reported", "questioned", "uncertain"]);
const POLARITIES = new Set(["positive", "negative"]);
const TIME_KEYS = { unknown: ["kind"], point: ["kind", "value"], interval: ["kind", "from", "to"], ongoing: ["kind", "since"] };

function fail(code, message) { const error = new Error(message); error.code = code; throw error; }
function exact(object, keys, where) {
  if (!object || typeof object !== "object" || Array.isArray(object)) fail("SHAPE", `${where} must be an object`);
  const actual = Object.keys(object).sort(), expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, i) => key !== expected[i])) fail("SHAPE", `${where} has unknown or missing keys`);
}
function validateTime(time, where) {
  if (!time || typeof time !== "object" || Array.isArray(time) || !TIME_KEYS[time.kind]) fail("TIME", `${where}.kind`);
  exact(time, TIME_KEYS[time.kind], where);
  for (const key of TIME_KEYS[time.kind].slice(1)) if (typeof time[key] !== "string" || !time[key]) fail("TIME", `${where}.${key}`);
}
function validateRecord(record) {
  exact(record, ["case_id", "turn", "decision", "assertions"], "record");
  if (typeof record.case_id !== "string" || !/^extract-[0-9]{2}$/.test(record.case_id)) fail("CASE_ID", "bad case id");
  if (typeof record.turn !== "string" || !record.turn) fail("TURN", "missing turn");
  if (!DECISIONS.has(record.decision) || !Array.isArray(record.assertions)) fail("DECISION", "bad decision/assertions");
  if (record.decision !== "write" && record.assertions.length) fail("NONWRITE_ASSERTIONS", "ignore/clarify cannot contain assertions");
  if (record.decision === "write" && !record.assertions.length) fail("WRITE_EMPTY", "write needs at least one assertion");
  const ids = new Set();
  for (const assertion of record.assertions) {
    exact(assertion, ["id", "predicate", "arguments", "polarity", "modality", "time", "source_span"], "assertion");
    if (typeof assertion.id !== "string" || !ATOM.test(assertion.id) || ids.has(assertion.id)) fail("ASSERTION_ID", "bad or duplicate assertion id"); ids.add(assertion.id);
    if (typeof assertion.predicate !== "string" || !ATOM.test(assertion.predicate)) fail("PREDICATE", "bad predicate");
    if (!Array.isArray(assertion.arguments) || assertion.arguments.length < 1 || assertion.arguments.length > 4 || assertion.arguments.some(value => typeof value !== "string" || !ATOM.test(value))) fail("ARGUMENT", "bad arguments");
    if (!POLARITIES.has(assertion.polarity)) fail("POLARITY", "bad polarity");
    if (!MODALITIES.has(assertion.modality)) fail("MODALITY", "bad modality");
    validateTime(assertion.time, "assertion.time");
    if (typeof assertion.source_span !== "string" || !assertion.source_span || !record.turn.includes(assertion.source_span)) fail("PROVENANCE", "source span is not in turn");
  }
  return record;
}
function readJsonl(file) { return fs.readFileSync(file, "utf8").trim().split(/\r?\n/).map((line, i) => { try { return JSON.parse(line); } catch (_) { fail("JSONL", `line ${i + 1}`); } }); }
function sha256(file) { return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"); }
function validateDataset(file) {
  const records = readJsonl(file), cases = new Set();
  records.forEach(record => { validateRecord(record); if (cases.has(record.case_id)) fail("DUPLICATE_CASE", record.case_id); cases.add(record.case_id); });
  return { status: "ok", record_count: records.length, sha256: sha256(file) };
}
if (require.main === module) {
  const file = process.argv[2] || ".cdr/datasets/extraction-annotation-pilot-v1.jsonl";
  try { process.stdout.write(`${JSON.stringify(validateDataset(file))}\n`); } catch (error) { process.stderr.write(`${error.code || "ERROR"}: ${error.message}\n`); process.exitCode = 1; }
}
module.exports = { validateDataset, validateRecord };
