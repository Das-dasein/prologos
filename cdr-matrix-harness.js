"use strict";

// Offline matrix contract scorer. It validates the pinned gold cases and
// emits denominators; it deliberately does not call a provider or claim model
// quality.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = __dirname;
const DATASET = path.join(ROOT, ".cdr/datasets/dialogues-pilot-v1.jsonl");
const SHA256 = "ed9dd7f7ab4983266ab2df3a5ccb31a1f8b367163a09f2c57d2d096e8699d041";
const CATEGORIES = ["stable recall", "explicit correction/supersession", "temporal change without contradiction", "direct positive/negative conflict", "non-memory content", "alias/coreference ambiguity"];

function fail(message) { const error = new Error(message); error.code = "MATRIX_CONTRACT"; throw error; }
function read() { return fs.readFileSync(DATASET, "utf8").trim().split(/\r?\n/).map(line => JSON.parse(line)); }
function sha256() { return crypto.createHash("sha256").update(fs.readFileSync(DATASET)).digest("hex"); }
function score(records) {
  if (sha256() !== SHA256) fail("dialogues dataset SHA-256 mismatch");
  if (records.length !== 12) fail(`expected 12 cases, got ${records.length}`);
  const ids = new Set(), counts = Object.fromEntries(CATEGORIES.map(category => [category, 0]));
  const category_metrics = {};
  for (const record of records) {
    if (ids.has(record.case_id)) fail(`duplicate case ${record.case_id}`);
    ids.add(record.case_id);
    if (!CATEGORIES.includes(record.category)) fail(`unknown category ${record.category}`);
    if (!Array.isArray(record.dialogue) || !Array.isArray(record.gold_operations) || !record.oracle) fail(`invalid case ${record.case_id}`);
    counts[record.category] += 1;
  }
  for (const category of CATEGORIES) {
    if (counts[category] !== 2) fail(`${category} must contain exactly 2 cases`);
    const subset = records.filter(record => record.category === category);
    const turns = subset.reduce((sum, record) => sum + record.dialogue.length, 0);
    const write_turns = subset.reduce((sum, record) => sum + record.gold_operations.filter(operation => operation.kind === "write").length, 0);
    const assertions = subset.reduce((sum, record) => sum + record.gold_operations.filter(operation => operation.kind === "write").length, 0);
    const durable_turns = category === "alias/coreference ambiguity" ? 0 : write_turns;
    const answerable_queries = subset.filter(record => record.oracle.query_answers.length > 0).length;
    category_metrics[category] = { turns, write_turns, assertions, durable_turns, answerable_queries };
  }
  return { schema_version: "prolog-memory-evaluation-matrix-v1", dataset_sha256: SHA256, case_count: records.length, turn_count: records.reduce((n, r) => n + r.dialogue.length, 0), category_metrics, metrics: { "Matrix A": ["decision", "assertion_exact_match", "write_precision", "write_recall", "predicate", "arguments", "polarity", "time", "modality", "provenance", "hallucination", "false_clarification"], "Matrix B": ["write_precision", "write_recall", "active_state_accuracy", "conflict_accuracy", "provenance_completeness", "false_clarification", "stale_or_contradictory_error"] }, status: "gold_contract_valid" };
}

if (require.main === module) {
  try { console.log(JSON.stringify(score(read()), null, 2)); }
  catch (error) { console.error(`${error.code || "ERROR"}: ${error.message}`); process.exitCode = 1; }
}
module.exports = { score, SHA256 };
