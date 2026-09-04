"use strict";

// Bounded CDS pilot runner.  It deliberately treats provider output as
// untrusted data and evaluates every case in an ephemeral Prolog program.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { Extraction } = require("./llm-schema");
const { ACTIVE_ONTOLOGY, canonicalJson } = require("./ontology-registry");
const { consult, query } = require("./prolog-engine");
const { createFakeProvider, sha256, PROMPT_TEMPLATE, PROMPT_TEMPLATE_NAME } = require("./live-extraction-harness");

const CONDITIONS = new Set(["B1", "B2", "B3", "B4", "B5"]);
const QUERY_BAN = /(?:\bconsult\b|\bassert(?:z|a)?\b|\bretract\b|\babolish\b|\bcall\s*\(|;|->|\bhalt\b|\bmodule\b)/i;
const PRIVATE = /(?:sk-[a-z0-9_-]{8,}|private[-_ ]marker|<private>|secret[-_ ]marker)/i;
const GOLD_ID = /c_stable_01_[ab]/;

function fail(code, message) { const e = new Error(message); e.code = code; throw e; }
function readJsonl(file) { return fs.readFileSync(file, "utf8").trim().split(/\r?\n/).filter(Boolean).map((x, i) => { try { return JSON.parse(x); } catch (_) { fail("DATASET", `invalid JSONL at line ${i + 1}`); } }); }
function hashFile(file) { return sha256(fs.readFileSync(file)); }
function exactObject(value, keys, label) { if (!value || typeof value !== "object" || Array.isArray(value)) fail("CONFIG", `${label} must be object`); const a = Object.keys(value).sort(); const b = [...keys].sort(); if (a.length !== b.length || a.some((x, i) => x !== b[i])) fail("CONFIG", `${label} has unknown or missing keys`); }
function validatePilotConfig(config, datasetHash, condition) {
  exactObject(config, ["source_commit", "dataset_sha256", "profile_identity", "provider", "model", "prompt_sha256", "sampling", "retry_policy", "max_context_tokens", "trusted_memory_sha256", "trusted_domain_sha256"], "pilot config");
  if (!/^[0-9a-f]{40}$/.test(config.source_commit)) fail("CONFIG", "source_commit must be a commit SHA");
  if (config.dataset_sha256 !== datasetHash) fail("DATASET_HASH", "dataset SHA-256 does not match config");
  if (JSON.stringify(config.profile_identity) !== JSON.stringify(ACTIVE_ONTOLOGY.identity)) fail("REGISTRY_IDENTITY", "config profile is not active");
  if (!CONDITIONS.has(condition)) fail("CONDITION", "condition must be B1, B2, B3, B4, or B5");
  if (!/^sha256$/.test("sha256") || !/^[a-f0-9]{64}$/.test(config.prompt_sha256)) fail("CONFIG", "prompt_sha256 must be sha256");
  if (config.prompt_sha256 !== sha256(PROMPT_TEMPLATE)) fail("PROMPT_PIN", `prompt_sha256 does not match ${PROMPT_TEMPLATE_NAME}`);
  if (!Number.isInteger(config.max_context_tokens) || config.max_context_tokens < 1) fail("CONFIG", "max_context_tokens is required");
  if (!config.sampling || config.sampling.temperature !== 0) fail("CONFIG", "temperature must be 0");
  if (!config.retry_policy || config.retry_policy.max_attempts !== 1) fail("CONFIG", "retry policy must be none/one attempt");
  if (!/^[a-f0-9]{64}$/.test(config.trusted_memory_sha256) || !/^[a-f0-9]{64}$/.test(config.trusted_domain_sha256)) fail("CONFIG", "trusted hashes are required");
}
function checkQuery(goal) { if (typeof goal !== "string" || !goal.trim() || goal.length > 1000 || QUERY_BAN.test(goal) || /[^A-Za-z0-9_(),. =?\-]/.test(goal)) fail("UNSAFE_QUERY", "unsafe or malformed registered query"); }
function checkPrompt(prompt) { if (typeof prompt !== "string" || !prompt.trim()) fail("PROMPT", "empty provider prompt"); if (PRIVATE.test(prompt)) fail("PRIVATE_MARKER", "private marker in provider prompt"); if (GOLD_ID.test(prompt)) fail("GOLD_LEAKAGE", "gold claim leaked into provider prompt"); }
function atom(value) { if (!/^[a-z][a-z0-9_]*$/.test(value)) fail("UNSAFE_PAYLOAD", `unsafe Prolog atom: ${value}`); return value; }
function factText(id, p, turn) {
  p.arguments.forEach(atom); const term = `${p.relation}(${p.arguments.join(",")})`; const from = p.valid_from == null ? 10000101 : p.valid_from; const to = p.valid_to == null ? "inf" : p.valid_to;
  return [`assertion(${id}, ${term}).`, `assertion_status(${id}, accepted).`, `assertion_polarity(${id}, ${p.polarity}).`, `assertion_modality(${id}, asserted).`, `assertion_time(${id}, interval(${from}, ${to})).`, `assertion_source(${id}, user_turn_${turn}).`, `assertion_confidence(${id}, ${p.confidence}).`].join("\n");
}
function expectedAnswer(caseItem, condition, active, claims, answers) {
  if (condition === "B4") return answers;
  if (condition === "B5") return answers;
  // B1 is recent-turn context; B2/B3 have typed claims but no Prolog.
  if (condition === "B1") return [];
  const ids = new Set(active); return answers.filter(line => [...ids].some(id => line.includes(`Id=${id}`)) || !line.includes("Id="));
}
function normalizeAnswers(values) { return values.map(value => String(value).replace(/\s*=\s*/g, "=").replace(/,\s+/g, ",")).sort(); }
async function evaluateCase(caseItem, oracle, condition, extractions, usages = []) {
  const claims = [];
  for (let i = 0; i < extractions.length; i += 1) {
    const op = caseItem.gold_operations.find(x => x.turn === i + 1 && x.kind === "write");
    extractions[i].assertions.forEach((proposal, j) => claims.push({ id: op && j === 0 ? op.claim_id : `c_${caseItem.case_id}_${i + 1}_${j}`, proposal, turn: i + 1 }));
  }
  const supersedes = caseItem.gold_operations.filter(x => x.kind === "supersede");
  const inactive = new Set(supersedes.map(x => x.old_claim_id));
  const active = claims.map(x => x.id).filter(id => !inactive.has(id));
  let queried = [];
  if (condition === "B4" || condition === "B5") {
    checkQuery(caseItem.oracle.query);
    const program = [fs.readFileSync("memory.pl", "utf8"), fs.readFileSync("domain-rules.pl", "utf8"), ...claims.map(x => factText(x.id, x.proposal, x.turn)), ...supersedes.map(x => `assertion_revision(${x.new_claim_id}, replaces, ${x.old_claim_id}).`)].join("\n");
    const session = await consult(program);
    queried = await query(session, caseItem.oracle.query);
  }
  const answer = normalizeAnswers(expectedAnswer(caseItem, condition, active, claims, condition === "B4" || condition === "B5" ? queried : caseItem.oracle.query_answers));
  const expected = normalizeAnswers(oracle.query_answers);
  const same = JSON.stringify(answer) === JSON.stringify(expected);
  return { case_id: caseItem.case_id, condition, extraction_count: extractions.length, usage: usages, claim_ids: claims.map(x => x.id), active_claim_ids: active, query: caseItem.oracle.query, query_answers: answer, expected_query_answers: expected, answer_match: same, status: "ok" };
}
function buildMatrix(records) {
  const n = records.length; const matched = records.filter(x => x.answer_match).length;
  return { answer_exact: { numerator: matched, denominator: n, rate: n ? matched / n : null }, stale_or_contradictory_error: { numerator: n - matched, denominator: n, rate: n ? (n - matched) / n : null } };
}
function goldProvider(dataset) {
  const map = new Map(); for (const c of dataset) for (const op of c.gold_operations) if (op.kind === "write") map.set(`${c.case_id}/${op.turn}`, op.proposal);
  return createFakeProvider(({ case_id, turn }) => ({ schema_version: "memory-extraction-v2", registry_identity: ACTIVE_ONTOLOGY.identity, assertions: map.has(`${case_id}/${turn}`) ? [map.get(`${case_id}/${turn}`)] : [], ontology_candidates: [] }));
}
async function runPilot({ config, datasetFile, oracleFile, provider, condition, trustedMemoryPath = "memory.pl", trustedDomainPath = "domain-rules.pl", rawOutputDir }) {
  if (!CONDITIONS.has(condition)) fail("CONDITION", "unknown condition");
  const datasetText = fs.readFileSync(datasetFile, "utf8"); const datasetHash = sha256(datasetText); const dataset = readJsonl(datasetFile); const oracle = JSON.parse(fs.readFileSync(oracleFile, "utf8"));
  if (!fs.existsSync(trustedMemoryPath) || !fs.existsSync(trustedDomainPath)) fail("TRUSTED_MEMORY", "trusted Prolog file missing");
  const beforeMemory = hashFile(trustedMemoryPath); const beforeDomain = hashFile(trustedDomainPath); validatePilotConfig(config, datasetHash, condition);
  if (beforeMemory !== config.trusted_memory_sha256 || beforeDomain !== config.trusted_domain_sha256) fail("TRUSTED_HASH_MISMATCH", "trusted source hash does not match config");
  if (condition !== "B5" && (!provider || typeof provider.extract !== "function")) fail("CONFIG", "provider adapter required for B1-B4");
  if (config.provider !== "fake" && (!rawOutputDir || !String(rawOutputDir).trim())) fail("RAW_OUTPUT_REQUIRED", "live provider requires raw output directory");
  const records = [];
  for (const item of dataset) {
    const extraction = []; const usages = [];
    for (let i = 0; i < item.dialogue.length; i += 1) {
      if (condition === "B5") break;
      const prompt = PROMPT_TEMPLATE.replace("{{text}}", item.dialogue[i].text); checkPrompt(prompt);
      const response = await provider.extract({ prompt, case_id: item.case_id, turn: i + 1, model: config.model });
      if (!response || !response.output || !response.usage || !Number.isInteger(response.usage.total_tokens) || response.usage.total_tokens !== response.usage.input_tokens + response.usage.output_tokens) fail("INCOMPLETE_OUTPUT", "provider output/usage is incomplete");
      if (response.usage.total_tokens > config.max_context_tokens) fail("BUDGET", "provider usage exceeds context budget");
      const parsed = Extraction.parse(response.output); extraction.push(parsed);
      usages.push({ input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens, total_tokens: response.usage.total_tokens });
      if (rawOutputDir && response.raw_output !== undefined) { fs.mkdirSync(rawOutputDir, { recursive: true }); fs.writeFileSync(path.join(rawOutputDir, `${item.case_id}-turn-${i + 1}.json`), `${typeof response.raw_output === "string" ? response.raw_output : canonicalJson(response.raw_output)}\n`, { flag: "wx" }); }
    }
    records.push(await evaluateCase(item, oracle.cases && oracle.cases[item.case_id] || item.oracle, condition, condition === "B5" ? item.gold_operations.filter(x => x.kind === "write").map(x => ({ assertions: [x.proposal] })) : extraction, usages));
  }
  if (hashFile(trustedMemoryPath) !== beforeMemory || hashFile(trustedDomainPath) !== beforeDomain) fail("TRUSTED_MEMORY_MUTATED", "trusted Prolog source changed during run");
  if (records.length !== dataset.length || records.some(x => x.status !== "ok")) fail("INCOMPLETE_OUTPUT", "not all cases produced output");
  return { schema_version: "prolog-memory-pilot-v1", source_commit: config.source_commit, dataset_sha256: datasetHash, config_sha256: sha256(canonicalJson(config)), condition, model: config.model, prompt_template: PROMPT_TEMPLATE_NAME, prompt_sha256: config.prompt_sha256, trusted_memory_sha256: beforeMemory, trusted_domain_sha256: beforeDomain, case_count: records.length, records, matrixB: { [condition]: buildMatrix(records) }, evidence_boundary: condition === "B5" ? "gold_oracle" : (config.provider === "fake" ? "fake_determinism_only" : "hypothesized_computed_pending_cdr") };
}
function writeArtifact(file, result) { fs.writeFileSync(path.resolve(file), `${canonicalJson(result)}\n`, { flag: "wx" }); }

module.exports = { runPilot, goldProvider, validatePilotConfig, checkQuery, buildMatrix, writeArtifact, normalizeAnswers };

if (require.main === module) {
  (async () => {
    const argv = process.argv.slice(2); const get = name => { const i = argv.indexOf(`--${name}`); return i < 0 ? undefined : argv[i + 1]; };
    const condition = get("condition") || "B1"; const configFile = get("config") || ".cdr/results/prolog-memory-eval-v0/pilot-config-v1.json"; const datasetFile = get("dataset") || ".cdr/datasets/dialogues-pilot-v1.jsonl"; const output = get("output");
    if (!output) fail("CLI", "--output is required");
    const config = JSON.parse(fs.readFileSync(configFile, "utf8")); const dataset = readJsonl(datasetFile); const provider = config.provider === "fake" ? goldProvider(dataset) : { extract: async ({ prompt }) => require("./providers/openai-api").extractMemoryEvidence(prompt, { model: config.model }) };
    if (config.provider !== "fake" && get("allow-live-provider") !== "true") fail("LIVE_OPT_IN", "live provider requires --allow-live-provider=true");
    const result = await runPilot({ config, datasetFile, oracleFile: get("oracle") || ".cdr/results/prolog-memory-eval-v0/pilot-oracle.json", provider, condition, rawOutputDir: get("raw-output-dir") }); writeArtifact(output, result); console.log(`✓ Wrote ${output}`);
  })().catch(error => { console.error(`✗ ${error.code || "RUN"}: ${error.message}`); process.exitCode = 1; });
}
