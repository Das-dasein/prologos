"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");

const ATOM = /^[a-z][a-z0-9_]*$/;
const DECISIONS = new Set(["write", "ignore", "clarify"]);
const MODALITIES = new Set(["asserted", "reported", "questioned", "uncertain"]);
const POLARITIES = new Set(["positive", "negative"]);
const TIME_KEYS = { unknown: ["kind"], point: ["kind", "value"], interval: ["kind", "from", "to"], ongoing: ["kind", "since"] };
const DEFAULT_DATASET = ".cdr/datasets/extraction-annotation-pilot-v1.jsonl";
const DATASET_SHA256 = "64b68339eb158c9f4242f179b63502718a92382c2e22470b8ca1a6e268341b4f";
const PRIVATE_MARKERS = ["data/memory.pl", "OPENAI_API_KEY", "sk-", "DO_NOT_RENDER_PRIVATE_MEMORY"];

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
function validateDataset(file, expectedSha256 = DATASET_SHA256) {
  const records = readJsonl(file), cases = new Set();
  records.forEach(record => { validateRecord(record); if (cases.has(record.case_id)) fail("DUPLICATE_CASE", record.case_id); cases.add(record.case_id); });
  const digest = sha256(file);
  if (expectedSha256 && digest !== expectedSha256) fail("DATASET_SHA256", "dataset does not match pinned SHA-256");
  const source = fs.readFileSync(file, "utf8");
  if (PRIVATE_MARKERS.some(marker => source.includes(marker))) fail("DATA_POLICY", "dataset contains a prohibited private-data marker");
  return { status: "ok", record_count: records.length, sha256: digest };
}
function assertionKey(assertion) { return `${assertion.predicate}(${assertion.arguments.join(",")})`; }
function scoreAnnotations(goldFile, candidateFile) {
  validateDataset(goldFile, DATASET_SHA256);
  validateDataset(candidateFile, null);
  const gold = readJsonl(goldFile), candidate = readJsonl(candidateFile);
  gold.forEach(validateRecord); candidate.forEach(validateRecord);
  const predicted = new Map();
  for (const record of candidate) { if (predicted.has(record.case_id)) fail("DUPLICATE_CASE", record.case_id); predicted.set(record.case_id, record); }
  const cases = [];
  for (const expected of gold) {
    const actual = predicted.get(expected.case_id);
    if (!actual) { cases.push({ case_id: expected.case_id, errors: ["decision"] }); continue; }
    const errors = new Set();
    if (actual.decision !== expected.decision) {
      errors.add("decision");
      if (expected.decision === "clarify") errors.add("coreference");
      if (actual.decision === "write" && expected.decision !== "write") errors.add("hallucination");
    }
    if (expected.decision === "write" && actual.decision === "write") {
      if (expected.assertions.length !== actual.assertions.length) errors.add("atomicity");
      const unmatched = new Set(actual.assertions);
      for (const wanted of expected.assertions) {
        let got = actual.assertions.find(assertion => unmatched.has(assertion) && assertionKey(assertion) === assertionKey(wanted));
        if (!got) {
          got = actual.assertions.find(assertion => unmatched.has(assertion) && assertion.predicate === wanted.predicate);
          if (got) errors.add("argument");
        }
        if (!got) {
          got = actual.assertions.find(assertion => unmatched.has(assertion) && JSON.stringify(assertion.arguments) === JSON.stringify(wanted.arguments));
          if (got) errors.add("predicate");
        }
        if (!got) { errors.add("atomicity"); continue; }
        unmatched.delete(got);
        if (got.polarity !== wanted.polarity) errors.add("polarity");
        if (got.modality !== wanted.modality) errors.add("modality");
        if (JSON.stringify(got.time) !== JSON.stringify(wanted.time)) errors.add("time");
        if (got.source_span !== wanted.source_span) errors.add("provenance");
      }
      if (unmatched.size) errors.add("hallucination");
    }
    cases.push({ case_id: expected.case_id, errors: [...errors].sort() });
  }
  for (const id of predicted.keys()) if (!gold.some(record => record.case_id === id)) fail("UNKNOWN_CASE", id);
  const error_counts = {};
  cases.flatMap(item => item.errors).forEach(error => { error_counts[error] = (error_counts[error] || 0) + 1; });
  return { schema_version: "extraction-annotation-score-v1", gold_sha256: sha256(goldFile), candidate_sha256: sha256(candidateFile), cases, error_counts };
}
if (require.main === module) {
  const file = process.argv[2] || DEFAULT_DATASET;
  try { process.stdout.write(`${JSON.stringify(validateDataset(file))}\n`); } catch (error) { process.stderr.write(`${error.code || "ERROR"}: ${error.message}\n`); process.exitCode = 1; }
}
module.exports = { validateDataset, validateRecord, scoreAnnotations, DATASET_SHA256 };
