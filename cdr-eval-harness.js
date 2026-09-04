"use strict";

// Deterministic gold-injection runner for the CDR pilot. It deliberately does
// not call an LLM: this is the symbolic method gate consumed by CDR.
const crypto = require("node:crypto");
const execFileSync = require("node:child_process").execFileSync;
const fs = require("node:fs");
const path = require("node:path");
const { consult, query } = require("./swipl-engine");

const ROOT = __dirname;
const DEFAULT_DATASET = path.join(ROOT, ".cdr/datasets/dialogues-pilot-v1.jsonl");
const DEFAULT_ORACLE = path.join(ROOT, ".cdr/results/prolog-memory-eval-v0/pilot-oracle.json");
const DEFAULT_CONFIG = path.join(ROOT, ".cdr/results/prolog-memory-eval-v0/eval-config-v1.json");
const ATOM = /^[a-z][a-z0-9_]*$/;
const CLAIM_ID = /^c_[a-z0-9_]+$/;
const PILOT_QUERY_REGISTRY = Object.freeze({
  "stable-01": "active_assertion_record(Id, positive, lives_in(user, City), _, From, To, _).",
  "stable-02": "active_assertion_record(Id, positive, knows_technology(user, Language), _, From, To, _).",
  "correction-01": "active_assertion_record(Id, positive, lives_in(user, City), _, From, To, _).",
  "correction-02": "current_project(user, acme, Project).",
  "temporal-01": "active_assertion_record(Id, positive, lives_in(user, City), _, From, To, _), overlaps(20210101, 20211231, From, To).",
  "temporal-02": "active_assertion_record(Id, positive, worked_with_technology(user, Technology), _, From, To, _), overlaps(20250101, 20251231, From, To).",
  "conflict-01": "conflict(direct, Id1, Id2, likes(user,coffee)).",
  "conflict-02": "conflict(direct, Id1, Id2, lives_in(user,paris)).",
  "nonmemory-01": "active_assertion_record(_,_,_,_,_,_,_).",
  "nonmemory-02": "active_assertion_record(_,_,_,_,_,_,_).",
  "ambiguity-01": "active_assertion_record(_,_,_,_,_,_,_).",
  "ambiguity-02": "active_assertion_record(_,_,_,_,_,_,_).",
});

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (error) { fail("JSON_READ", `${file}: ${error.message}`); }
}

function readJsonl(file) {
  return fs.readFileSync(file, "utf8").trim().split(/\r?\n/).map((line, index) => {
    try { return JSON.parse(line); }
    catch (error) { fail("JSONL_READ", `${file}:${index + 1}: ${error.message}`); }
  });
}

function atom(value, label) {
  if (typeof value !== "string" || !ATOM.test(value)) fail("UNSAFE_ATOM", `${label} is not a lowercase atom`);
  return value;
}

function claimFact(operation, claimId) {
  if (!operation || operation.kind !== "write" || !operation.proposal) fail("DATA_SHAPE", `missing write proposal for ${claimId}`);
  if (typeof claimId !== "string" || !CLAIM_ID.test(claimId)) fail("UNSAFE_CLAIM_ID", claimId);
  const p = operation.proposal;
  if (!["positive", "negative"].includes(p.polarity)) fail("DATA_SHAPE", `${claimId}: polarity`);
  atom(p.relation, `${claimId}.relation`);
  if (!Array.isArray(p.arguments) || p.arguments.length < 1 || p.arguments.length > 4) fail("DATA_SHAPE", `${claimId}: arguments`);
  p.arguments.forEach((value, index) => atom(value, `${claimId}.arguments[${index}]`));
  for (const value of [p.valid_from, p.valid_to]) {
    if (value !== null && (!Number.isInteger(value) || value < 10000101 || value > 99991231)) fail("DATA_SHAPE", `${claimId}: date`);
  }
  if (typeof p.confidence !== "number" || p.confidence < 0 || p.confidence > 1) fail("DATA_SHAPE", `${claimId}: confidence`);
  const from = p.valid_from === null ? 10000101 : p.valid_from;
  const to = p.valid_to === null ? "inf" : p.valid_to;
  const proposition = `${p.relation}(${p.arguments.join(",")})`;
  return [
    `assertion(${claimId},${proposition}).`,
    `assertion_polarity(${claimId},${p.polarity}).`,
    `assertion_modality(${claimId},asserted).`,
    `assertion_time(${claimId},interval(${from},${to})).`,
    `assertion_source(${claimId},user_turn_${operation.turn || 1}).`,
    `assertion_confidence(${claimId},${p.confidence}).`,
  ].join("\n");
}

function operationsFor(record) {
  const operations = [];
  for (const operation of record.gold_operations || []) {
    if (operation.kind === "write") operations.push(claimFact(operation, operation.claim_id));
    else if (operation.kind === "supersede") {
      if (!CLAIM_ID.test(operation.new_claim_id) || !CLAIM_ID.test(operation.old_claim_id)) fail("UNSAFE_CLAIM_ID", record.case_id);
      operations.push(`assertion_revision(${operation.new_claim_id},replaces,${operation.old_claim_id}).`);
    } else if (!["ignore", "clarify"].includes(operation.kind)) fail("DATA_SHAPE", `${record.case_id}: unknown operation ${operation.kind}`);
  }
  return operations;
}

function idsFromActive(answer) {
  const match = /^active_assertion_record\(([^,]+),/.exec(answer);
  return match ? match[1] : null;
}

function conflictFromAnswer(answer) {
  const match = /^unresolved_conflict\(([^,]+),([^,]+),([^,]+),/.exec(answer);
  return match ? `${match[1]}:${match[2]}:${match[3]}:unresolved` : null;
}

function parseTerm(text) {
  let index = 0;
  function skip() { while (/\s/.test(text[index] || "")) index += 1; }
  function term() {
    skip();
    const name = /^(?:[A-Za-z_][A-Za-z0-9_]*|[0-9]+(?:\.[0-9]+)?)/.exec(text.slice(index));
    if (!name) fail("TERM_PARSE", `cannot parse term near ${text.slice(index)}`);
    index += name[0].length;
    const node = { name: name[0], args: [] };
    skip();
    if (text[index] === "(") {
      index += 1;
      skip();
      if (text[index] !== ")") {
        while (true) {
          node.args.push(term());
          skip();
          if (text[index] === ",") { index += 1; continue; }
          if (text[index] === ")") break;
          fail("TERM_PARSE", `expected comma or close near ${text.slice(index)}`);
        }
      }
      index += 1;
    }
    return node;
  }
  let result = term();
  skip();
  while (text[index] === ",") {
    index += 1;
    const right = term();
    result = { name: ",", args: [result, right] };
    skip();
  }
  if (index !== text.length && text[index] === ".") index += 1;
  skip();
  if (index !== text.length) fail("TERM_PARSE", `trailing text near ${text.slice(index)}`);
  return result;
}

function queryAnswer(queryText, answerText) {
  const pattern = parseTerm(queryText);
  const answer = parseTerm(answerText);
  const bindings = new Map();
  function match(expected, actual) {
    if (expected.name === "_") return;
    if (/^[A-Z_]/.test(expected.name)) {
      const prior = bindings.get(expected.name);
      if (prior && prior !== actual.name) fail("QUERY_SHAPE", `variable ${expected.name} is inconsistent`);
      bindings.set(expected.name, actual.name);
      return;
    }
    if (expected.name !== actual.name || expected.args.length !== actual.args.length) {
      fail("QUERY_SHAPE", `query ${queryText} does not match answer ${answerText}`);
    }
    expected.args.forEach((child, i) => match(child, actual.args[i]));
  }
  match(pattern, answer);
  return [...bindings].map(([name, value]) => `${name}=${value}`).join(",");
}

function provenance(record, expected) {
  const result = {};
  for (const operation of record.gold_operations || []) {
    if (operation.kind !== "write") continue;
    const p = operation.proposal;
    if (!Object.prototype.hasOwnProperty.call(expected, operation.claim_id)) continue;
    result[operation.claim_id] = {
      source: `user_turn_${operation.turn}`,
      from: p.valid_from === null ? 10000101 : p.valid_from,
      to: p.valid_to === null ? "inf" : p.valid_to,
    };
  }
  return result;
}

function sha256(file) { return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"); }

function validateConfig(config) {
  if (!config || config.version !== "eval-config-v1") fail("CONFIG_SHAPE", "expected eval-config-v1");
  if (config.mode !== "gold-injection" || config.condition !== "B5") {
    fail("CONFIG_MODE", "gold harness requires mode=gold-injection and condition=B5");
  }
  if (config.effective_context_tokens !== 4096 || config.retry_policy !== "none" || config.temperature !== 0) {
    fail("CONFIG_SENTINEL", "gold harness configuration does not match the pinned protocol");
  }
  if (config.dataset_case_count !== Object.keys(PILOT_QUERY_REGISTRY).length) {
    fail("CONFIG_CASE_COUNT", "pinned case count does not match the query registry");
  }
  for (const key of ["dataset_sha256", "oracle_sha256", "trusted_memory_sha256", "trusted_domain_sha256"]) {
    if (typeof config[key] !== "string" || !/^[a-f0-9]{64}$/.test(config[key])) {
      fail("CONFIG_SHA256", `${key} must be a SHA-256 digest`);
    }
  }
  return config;
}

function verifyPinnedInputs(config, datasetFile, oracleFile) {
  const actual = {
    dataset_sha256: sha256(datasetFile),
    oracle_sha256: sha256(oracleFile),
    trusted_memory_sha256: sha256(path.join(ROOT, "memory.pl")),
    trusted_domain_sha256: sha256(path.join(ROOT, "domain-rules.pl")),
  };
  for (const [key, digest] of Object.entries(actual)) {
    if (config[key] !== digest) fail("INPUT_SHA256", `${key} does not match pinned input`);
  }
  return actual;
}

function fixedQuery(record) {
  const queryText = PILOT_QUERY_REGISTRY[record.case_id];
  if (!queryText) fail("QUERY_REGISTRY", `${record.case_id}: unregistered case`);
  if (!record.oracle || record.oracle.query !== queryText) {
    fail("QUERY_REGISTRY", `${record.case_id}: query differs from the pinned registry`);
  }
  return queryText;
}

function sourceCommit(override) {
  if (override !== undefined) {
    if (typeof override !== "string" || !/^[a-f0-9]{40}$/.test(override)) {
      fail("SOURCE_COMMIT", "source commit must be a 40-character SHA-1");
    }
    return override;
  }
  try { return execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); }
  catch (_) { return null; }
}

async function runCase(record, oracleCase, queryText) {
  const program = fs.readFileSync(path.join(ROOT, "memory.pl"), "utf8") + "\n"
    + fs.readFileSync(path.join(ROOT, "domain-rules.pl"), "utf8") + "\n"
    + operationsFor(record).join("\n") + "\n";
  const session = consult(program);
  try {
    const [active, conflicts, answers] = await Promise.all([
      query(session, "active_assertion_record(Id, P, Proposition, Source, From, To, Confidence)."),
      query(session, "unresolved_conflict(Type, Id1, Id2, Subject)."),
      query(session, queryText),
    ]);
    const activeClaims = active.map(idsFromActive).filter(Boolean).sort();
    const conflictStates = conflicts.map(conflictFromAnswer).filter(Boolean).sort();
    const actual = {
      active_claims: activeClaims,
      conflicts: conflictStates,
      query_answers: answers.map(answer => queryAnswer(queryText, answer)).sort(),
      provenance: provenance(record, oracleCase.provenance),
    };
    const expected = {
      active_claims: [...oracleCase.active_claims].sort(),
      conflicts: oracleCase.conflicts.map(x => `${x.type}:${x.ids[0]}:${x.ids[1]}:${x.status}`).sort(),
      query_answers: [...oracleCase.query_answers].sort(),
      provenance: oracleCase.provenance,
    };
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      fail("ORACLE_MISMATCH", `${record.case_id}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
    return { case_id: record.case_id, status: "ok", ...actual };
  } finally {
    fs.rmSync(session.dir, { recursive: true, force: true });
  }
}

async function run(options = {}) {
  const datasetFile = options.dataset || DEFAULT_DATASET;
  const oracleFile = options.oracle || DEFAULT_ORACLE;
  const configFile = options.config || DEFAULT_CONFIG;
  const config = validateConfig(readJson(configFile));
  const inputHashes = verifyPinnedInputs(config, datasetFile, oracleFile);
  const records = readJsonl(datasetFile);
  const oracle = readJson(oracleFile);
  if (records.length !== config.dataset_case_count) fail("DATASET_COUNT", `expected ${config.dataset_case_count} records, got ${records.length}`);
  if (new Set(records.map(record => record.case_id)).size !== records.length) fail("DATASET_CASE_ID", "dataset contains duplicate case IDs");
  if (!oracle.expected_active_states || !oracle.expected_conflict_states || !oracle.expected_query_answers) fail("ORACLE_SHAPE", "pilot oracle is incomplete");
  const cases = [];
  for (const record of records) {
    const oracleCase = {
      active_claims: oracle.expected_active_states[record.case_id],
      conflicts: (oracle.expected_conflict_states[record.case_id] || []).map(value => {
        const [type, id1, id2, status] = value.split(":");
        return { type, ids: [id1, id2], status };
      }),
      query_answers: oracle.expected_query_answers[record.case_id] || [],
      provenance: record.oracle.provenance || {},
    };
    if (!oracleCase.active_claims) fail("ORACLE_CASE", `missing ${record.case_id}`);
    cases.push(await runCase(record, oracleCase, fixedQuery(record)));
  }
  return {
    schema_version: "cdr-gold-result-v1",
    status: "ok",
    mode: "gold-injection",
    source_commit: sourceCommit(options.sourceCommit),
    config_sha256: sha256(configFile),
    dataset_sha256: inputHashes.dataset_sha256,
    oracle_sha256: inputHashes.oracle_sha256,
    trusted_memory_sha256: inputHashes.trusted_memory_sha256,
    trusted_domain_sha256: inputHashes.trusted_domain_sha256,
    case_count: cases.length,
    cases,
  };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const option = name => {
    const index = args.indexOf(name);
    return index < 0 ? undefined : args[index + 1];
  };
  run({
    config: option("--config"),
    dataset: option("--dataset"),
    oracle: option("--oracle"),
    sourceCommit: option("--source-commit"),
  })
    .then(result => process.stdout.write(`${JSON.stringify(result)}\n`))
    .catch(error => {
      process.stdout.write(`${JSON.stringify({ schema_version: "cdr-gold-result-v1", status: "rejected", error: { code: error.code || "HARNESS", message: error.message } })}\n`);
      process.exitCode = 1;
    });
}

module.exports = { run, readJsonl, claimFact, validateConfig, fixedQuery };
