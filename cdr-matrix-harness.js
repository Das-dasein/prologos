"use strict";

// Offline matrix contract scorer. It validates the pinned gold cases and
// emits denominators; it deliberately does not call a provider or claim model
// quality.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { canonicalJson } = require("./ontology-registry");

const ROOT = __dirname;
const DATASET = path.join(ROOT, ".cdr/datasets/dialogues-pilot-v1.jsonl");
const CONFIG = path.join(ROOT, ".cdr/results/prolog-memory-eval-v0/pilot-config-v2.json");
const ORACLE = path.join(ROOT, ".cdr/results/prolog-memory-eval-v0/answer-oracle-v1.json");
const TRUSTED_MEMORY = path.join(ROOT, "memory.pl");
const TRUSTED_DOMAIN = path.join(ROOT, "domain-rules.pl");
const SHA256 = "ed9dd7f7ab4983266ab2df3a5ccb31a1f8b367163a09f2c57d2d096e8699d041";
const CATEGORIES = ["stable recall", "explicit correction/supersession", "temporal change without contradiction", "direct positive/negative conflict", "non-memory content", "alias/coreference ambiguity"];

function fail(message) { const error = new Error(message); error.code = "MATRIX_CONTRACT"; throw error; }
function read() { return fs.readFileSync(DATASET, "utf8").trim().split(/\r?\n/).map(line => JSON.parse(line)); }
function hashFile(file) { return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"); }
function sha256() { return hashFile(DATASET); }
function digest(value) { return crypto.createHash("sha256").update(canonicalJson(value)).digest("hex"); }
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
    const assertions = subset.reduce((sum, record) => sum + record.gold_operations.filter(operation => operation.kind === "write").reduce((n, operation) => n + (Array.isArray(operation.proposal) ? operation.proposal.length : 1), 0), 0);
    const durable_turns = category === "alias/coreference ambiguity" ? 0 : write_turns;
    const answerable_queries = subset.filter(record => record.oracle.query_answers.length > 0).length;
    category_metrics[category] = { turns, write_turns, assertions, durable_turns, answerable_queries,
      cells: { decision: { numerator: turns, denominator: turns, rate: 1 }, assertion_exact_match: { numerator: write_turns, denominator: write_turns, rate: write_turns ? 1 : null }, write_precision: { numerator: assertions, denominator: assertions, rate: assertions ? 1 : null }, write_recall: { numerator: assertions, denominator: assertions, rate: assertions ? 1 : null }, predicate: { numerator: assertions, denominator: assertions, rate: assertions ? 1 : null }, arguments: { numerator: assertions, denominator: assertions, rate: assertions ? 1 : null }, polarity: { numerator: assertions, denominator: assertions, rate: assertions ? 1 : null }, time: { numerator: assertions, denominator: assertions, rate: assertions ? 1 : null }, modality: { numerator: assertions, denominator: assertions, rate: assertions ? 1 : null }, provenance: { numerator: assertions, denominator: assertions, rate: assertions ? 1 : null }, hallucination: { numerator: 0, denominator: assertions, rate: assertions ? 0 : null }, false_clarification: { numerator: 0, denominator: durable_turns, rate: durable_turns ? 0 : null } } };
  }
  const matrixB = Object.fromEntries(["B1", "B2", "B3", "B4"].map(condition => [condition, { status: "N/A", reason: "no candidate run supplied" }]));
  const writes = records.flatMap(record => record.gold_operations).filter(operation => operation.kind === "write").length;
  const conflicts = records.filter(record => record.oracle.conflicts.length > 0).length;
  const provenanceClaims = records.reduce((sum, record) => sum + Object.keys(record.oracle.provenance || {}).length, 0);
  matrixB.B5 = { status: "gold_oracle", write_precision: { numerator: writes, denominator: writes, rate: 1 }, write_recall: { numerator: writes, denominator: writes, rate: 1 }, active_state_accuracy: { numerator: records.length, denominator: records.length, rate: 1 }, conflict_accuracy: { numerator: conflicts, denominator: conflicts, rate: 1 }, provenance_completeness: { numerator: provenanceClaims, denominator: provenanceClaims, rate: 1 }, false_clarification: { numerator: 0, denominator: records.reduce((sum, record) => sum + record.dialogue.filter((_, i) => record.gold_operations.some(operation => operation.turn === i + 1 && operation.kind === "write")).length, 0), rate: 0 }, stale_or_contradictory_error: { numerator: 0, denominator: conflicts + 4, rate: 0 } };
  return { schema_version: "prolog-memory-evaluation-matrix-v1", dataset_sha256: SHA256, case_count: records.length, turn_count: records.reduce((n, r) => n + r.dialogue.length, 0), category_metrics, matrixB, status: "gold_contract_valid" };
}

function scoreCandidateArtifact(file) {
  let artifact;
  try { artifact = JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (error) { fail(`candidate artifact cannot be read: ${error.message}`); }
  if (!artifact || artifact.schema_version !== "prolog-memory-pilot-v2" || artifact.artifact_kind !== "aggregate") fail("candidate must be a prolog-memory-pilot-v2 aggregate");
  if (!Array.isArray(artifact.conditions) || artifact.conditions.length !== 4 || artifact.conditions.some(entry => !["B1", "B2", "B3", "B4"].includes(entry.condition)) || new Set(artifact.conditions.map(entry => entry.condition)).size !== 4) fail("candidate must contain each B1-B4 condition exactly once");
  if (artifact.dataset_sha256 !== SHA256) fail("candidate dataset hash does not match pinned dataset");
  if (![CONFIG, ORACLE, TRUSTED_MEMORY, TRUSTED_DOMAIN].every(file => fs.existsSync(file))) fail("candidate pinned input is missing");
  let config;
  try { config = JSON.parse(fs.readFileSync(CONFIG, "utf8")); } catch (error) { fail(`candidate config cannot be read: ${error.message}`); }
  if (artifact.source_commit !== config.source_commit || artifact.config_sha256 !== digest(config) || artifact.oracle_sha256 !== hashFile(ORACLE) || artifact.trusted_memory_sha256 !== hashFile(TRUSTED_MEMORY) || artifact.trusted_domain_sha256 !== hashFile(TRUSTED_DOMAIN)) fail("candidate metadata does not match pinned inputs");
  if (!artifact.prompt_provenance || artifact.prompt_provenance.extraction_prompt_sha256 !== config.extraction_prompt_sha256 || artifact.prompt_provenance.provider_adapter_prompt_sha256 !== config.provider_adapter_prompt_sha256 || artifact.prompt_provenance.answer_prompt_sha256 !== config.answer_prompt_sha256) fail("candidate prompt metadata does not match pinned config");
  if (typeof artifact.oracle_sha256 !== "string" || !/^[a-f0-9]{64}$/.test(artifact.oracle_sha256) || typeof artifact.config_sha256 !== "string" || !/^[a-f0-9]{64}$/.test(artifact.config_sha256) || typeof artifact.trusted_memory_sha256 !== "string" || typeof artifact.trusted_domain_sha256 !== "string" || !artifact.prompt_provenance) fail("candidate top-level provenance hashes are incomplete");
  if (!Number.isInteger(artifact.measured_effective_context_budget_tokens) || artifact.conditions.some(entry => !entry.budget || entry.budget.equal !== true || entry.budget.configured_e !== artifact.measured_effective_context_budget_tokens)) fail("candidate effective budget is missing or unequal");
  for (const entry of artifact.conditions) {
    const condition = entry.artifact;
    if (!condition || condition.condition !== entry.condition || condition.schema_version !== "prolog-memory-pilot-v2" || condition.artifact_kind !== "condition" || condition.case_count !== 12 || !Array.isArray(condition.records) || condition.records.length !== 12 || condition.records.some(record => !Array.isArray(record.turn_outputs)) ) fail(`candidate ${entry.condition} condition artifact is incomplete`);
    if (condition.records.some(record => !record.answer_request || !record.answer || !record.memory_context || !record.memory_context.sha256 || !record.answer_request.raw_output_ref || record.answer_request.usage == null)) fail(`candidate ${entry.condition} is missing answer/raw/context evidence`);
    if (entry.artifact_sha256 !== digest(condition)) fail(`candidate ${entry.condition} artifact hash mismatch`);
    for (const key of ["source_commit", "dataset_sha256", "oracle_sha256", "config_sha256", "trusted_memory_sha256", "trusted_domain_sha256"]) {
      if (condition[key] !== artifact[key]) fail(`candidate ${entry.condition} ${key} mismatch`);
    }
    if (JSON.stringify(condition.prompt_provenance) !== JSON.stringify(artifact.prompt_provenance)) fail(`candidate ${entry.condition} prompt provenance mismatch`);
  }
  return { schema_version: "prolog-memory-evaluation-matrix-v2", dataset_sha256: artifact.dataset_sha256, oracle_sha256: artifact.oracle_sha256, measured_effective_context_budget_tokens: artifact.measured_effective_context_budget_tokens, matrixB: Object.fromEntries(artifact.conditions.map(entry => [entry.condition, entry.matrixB[entry.condition]])), evidence_boundary: artifact.evidence_boundary };
}

if (require.main === module) {
  try { const candidateIndex = process.argv.indexOf("--candidate"); console.log(JSON.stringify(candidateIndex >= 0 ? scoreCandidateArtifact(process.argv[candidateIndex + 1]) : score(read()), null, 2)); }
  catch (error) { console.error(`${error.code || "ERROR"}: ${error.message}`); process.exitCode = 1; }
}
module.exports = { score, scoreCandidateArtifact, SHA256 };
