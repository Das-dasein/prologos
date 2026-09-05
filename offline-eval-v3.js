#!/usr/bin/env node
"use strict";

// Offline-only replay scorer. It deliberately has no provider, network, or
// runtime imports: the aggregate and its archived raw envelopes are inputs.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const VERSION = "offline-eval-v3";
const CONDITIONS = ["B1", "B2", "B3", "B4"];
const ROOT = __dirname;
const DEFAULTS = {
  aggregate: path.join(ROOT, "reports/live-20260905-152059/aggregate.json"),
  dataset: path.join(ROOT, ".cdr/datasets/dialogues-pilot-v1.jsonl"),
  oracle: path.join(ROOT, ".cdr/results/prolog-memory-eval-v0/answer-oracle-v1.json"),
  rawManifest: path.join(ROOT, "reports/live-20260905-152059/manifest.json"),
  output: path.join(ROOT, "reports/live-20260905-152059/replay-v3.json")
};

function sha256(value) { return crypto.createHash("sha256").update(value).digest("hex"); }
function fileHash(file) { return sha256(fs.readFileSync(file)); }
function readJson(file) { return JSON.parse(fs.readFileSync(file, "utf8")); }
function readJsonl(file) { return fs.readFileSync(file, "utf8").trim().split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line)); }
function fail(message) { const error = new Error(message); error.code = "OFFLINE_EVAL_INPUT"; throw error; }
function canonical(value) { return JSON.stringify(value); }
function numberOr(value, fallback) { return value == null ? fallback : value; }
function interval(assertion) { return [numberOr(assertion.valid_from, 10000101), numberOr(assertion.valid_to, "inf")]; }

function normalizeAtom(value) {
  return String(value == null ? "" : value).trim().toLowerCase().replace(/^['"]|['"]$/g, "");
}
function normalizeFact(assertion, turn) {
  if (!assertion || typeof assertion !== "object" || !assertion.relation || !Array.isArray(assertion.arguments)) return null;
  return {
    turn,
    relation: normalizeAtom(assertion.relation),
    arguments: assertion.arguments.map(normalizeAtom),
    polarity: normalizeAtom(assertion.polarity || "positive"),
    modality: assertion.modality == null ? null : normalizeAtom(assertion.modality),
    interval: interval(assertion)
  };
}
function goldFacts(item, turn) {
  return (item.gold_operations || []).filter(op => op.turn === turn && op.kind === "write").map(op => ({
    turn,
    claim_id: op.claim_id,
    relation: normalizeAtom(op.proposal.relation),
    arguments: op.proposal.arguments.map(normalizeAtom),
    polarity: normalizeAtom(op.proposal.polarity || "positive"),
    modality: op.proposal.modality == null ? null : normalizeAtom(op.proposal.modality),
    interval: interval(op.proposal)
  }));
}
function factKey(f) { return canonical([f.turn, f.relation, f.arguments, f.polarity, f.modality, f.interval]); }
function sameContent(a, b) {
  return a.turn === b.turn && a.relation === b.relation && canonical(a.arguments) === canonical(b.arguments) &&
    a.polarity === b.polarity && a.modality === b.modality && canonical(a.interval) === canonical(b.interval);
}

function metric(numerator, denominator, eligible = denominator, unknown = 0) {
  return { numerator, denominator, eligible_count: eligible, unknown_count: unknown,
    coverage: denominator ? eligible / denominator : 0, rate: denominator ? numerator / denominator : null };
}
function verdict(status, reason, evidence = []) { return { status, reason, evidence_refs: evidence }; }

function extractionResult(item, record) {
  const perTurn = [];
  let expectedCount = 0, actualCount = 0, matchedCount = 0, duplicateCount = 0, unsupportedCount = 0, unknownCount = 0;
  for (let turn = 1; turn <= item.dialogue.length; turn++) {
    const expected = goldFacts(item, turn);
    const turnRecord = (record.turn_outputs || []).find(out => out.turn === turn);
    const assertions = turnRecord && turnRecord.output && Array.isArray(turnRecord.output.assertions) ? turnRecord.output.assertions : null;
    if (!turnRecord || assertions === null) {
      unknownCount += expected.length || 1;
      perTurn.push({ turn, expected: expected.map(factKey), actual: [], decision: verdict("unknown", "extraction output is missing or unparseable", [`${item.case_id}:turn:${turn}`]) });
      continue;
    }
    const actual = assertions.map(a => normalizeFact(a, turn)).filter(Boolean);
    expectedCount += expected.length; actualCount += actual.length;
    const used = new Set(); const matches = [];
    for (const want of expected) {
      const index = actual.findIndex((got, i) => !used.has(i) && sameContent(want, got));
      if (index >= 0) { used.add(index); matchedCount++; matches.push({ claim_id: want.claim_id, actual_index: index, fields: "relation,arguments,polarity,modality,interval,source_turn" }); }
    }
    const duplicateKeys = new Set();
    actual.forEach((fact, index) => { const key = factKey(fact); if (actual.findIndex(x => factKey(x) === key) !== index) duplicateKeys.add(key); });
    duplicateCount += duplicateKeys.size;
    unsupportedCount += Math.max(0, actual.length - matches.length);
    const expectedDecision = expected.length ? "write" : ((item.gold_operations || []).some(op => op.turn === turn && op.kind === "clarify") ? "clarify" : "ignore");
    const decision = expected.length === 0 && actual.length === 0
      ? verdict("pass", `expected ${expectedDecision}; no unsupported assertion`, [`${item.case_id}:turn:${turn}`])
      : expected.length > 0 && matches.length === expected.length && actual.length === expected.length
        ? verdict("pass", "all expected fact fields match one-to-one", matches.map(m => `${item.case_id}:turn:${turn}:claim:${m.claim_id}`))
        : verdict("fail", `${actual.length - matches.length} unsupported or mismatched assertion(s); ${expected.length - matches.length} expected fact(s) unmatched`, [`${item.case_id}:turn:${turn}`]);
    perTurn.push({ turn, expected: expected.map(factKey), actual: actual.map(factKey), matches, duplicate_count: duplicateKeys.size, decision });
  }
  return {
    per_turn: perTurn,
    one_to_one: { matched: matchedCount, expected: expectedCount, actual: actualCount, duplicates: duplicateCount, unsupported: unsupportedCount },
    precision: metric(matchedCount, actualCount, actualCount, unknownCount),
    recall: metric(matchedCount, expectedCount, expectedCount, unknownCount),
    unsupported_assertion: metric(unsupportedCount, actualCount, actualCount, unknownCount),
    unknown_count: unknownCount
  };
}

function plainText(value) { return String(value == null ? "" : value).toLowerCase().replace(/[`*_{}[\](),.!?:;"']/g, " ").replace(/\s+/g, " ").trim(); }
function hasAny(text, words) { return words.some(word => text.includes(word)); }
function contentVerdict(caseId, text) {
  const t = plainText(text);
  if (!t) return verdict("unknown", "answer text is missing");
  if (caseId === "stable-01" || caseId === "correction-01") return t.includes("samara") ? verdict("pass", "expected city is stated") : verdict("fail", "expected city samara is absent");
  if (caseId === "stable-02" || caseId === "temporal-02") return t.includes("python") ? verdict("pass", "expected technology is stated") : verdict("fail", "expected technology python is absent");
  if (caseId === "correction-02") return t.includes("borealis") && !t.includes("atlas") ? verdict("pass", "current project is stated without superseded project") : verdict("fail", t.includes("atlas") ? "superseded project atlas is present" : "current project borealis is absent");
  if (caseId === "temporal-01") return t.includes("omsk") && hasAny(t, ["2021", "2020", "2022"]) ? verdict("pass", "city and 2021 interval are stated") : verdict("fail", "expected Omsk/2021 fact is incomplete");
  if (caseId === "conflict-01" || caseId === "conflict-02") return hasAny(t, ["conflict", "contradict", "both"]) && hasAny(t, ["unresolved", "uncertain", "cannot choose", "неразреш"]) ? verdict("pass", "unresolved conflict is explicitly reported") : verdict("fail", "answer chooses or fails to flag the unresolved conflict");
  if (caseId === "ambiguity-01" || caseId === "ambiguity-02") return hasAny(t, ["clarif", "which person", "unclear", "no durable fact", "ask"]) ? verdict("pass", "clarification/no durable fact is requested") : verdict("fail", "ambiguous reference is answered as a durable fact");
  if (caseId === "nonmemory-01" || caseId === "nonmemory-02") return hasAny(t, ["no durable", "no fact", "not stored", "unknown", "none"]) ? verdict("pass", "absence of durable fact is reported") : verdict("fail", "answer asserts a durable user fact");
  return verdict("unknown", "no deterministic rubric for case");
}
function answerResult(item, record, expected) {
  const answer = record.answer || {};
  const text = answer.text;
  const legacy = text == null ? null : plainText(text) === plainText(expected.expected || "");
  const content = contentVerdict(item.case_id, text);
  const wanted = expected.source_claim_ids || [];
  let provenance;
  if (!wanted.length) provenance = verdict("pass", "oracle requires no memory provenance");
  else if (!Array.isArray(answer.source_turns) || !Array.isArray(answer.intervals) || !answer.source_turns.length) provenance = verdict("unknown", "answer has no usable provenance fields");
  else {
    const turns = new Set(answer.source_turns); const expectedTurns = new Set(expected.source_turns || []);
    const intervals = canonical(answer.intervals); const expectedIntervals = canonical(expected.intervals || []);
    provenance = turns.size === expectedTurns.size && [...expectedTurns].every(x => turns.has(x)) && intervals === expectedIntervals
      ? verdict("pass", "source turns and intervals match oracle") : verdict("fail", "source turns or intervals do not match oracle");
  }
  const stale = expected.stale_or_contradictory ? verdict("unknown", "oracle does not provide a positive safe-answer target") : content.status === "fail" && (item.case_id.startsWith("correction-") || item.case_id.startsWith("conflict-")) ? verdict("fail", "answer exposes stale or unresolved state incorrectly") : verdict("pass", "no stale/single-sided conflict signal in deterministic rubric");
  return { legacy_text_exact: verdict(legacy === null ? "unknown" : legacy ? "pass" : "fail", legacy === null ? "answer text missing" : legacy ? "legacy normalized string matches" : "legacy normalized string differs"), content, provenance, stale_or_contradictory: stale };
}

function validateRawManifest(manifest, baseDir, aggregate) {
  const entries = new Map((manifest.files || []).map(entry => [entry.path, entry]));
  const refs = [];
  for (const condition of aggregate.conditions || []) for (const record of condition.artifact.records || []) {
    for (const ref of [record.answer && record.answer_request && record.answer_request.raw_output_ref, ...(record.turn_outputs || []).map(out => out.raw_output_ref)]) if (ref && ref.kind === "file") refs.push(ref);
  }
  const missing = []; const bad = [];
  for (const ref of refs) {
    const mapped = entries.get(ref.path.replace(/^.*\/raw\//, "raw/")) || entries.get(ref.path);
    if (!mapped) { missing.push(ref.path); continue; }
    const file = path.join(baseDir, mapped.path);
    if (!fs.existsSync(file)) { missing.push(mapped.path); continue; }
    if (fileHash(file) !== mapped.sha256 || (ref.sha256 && ref.sha256 !== mapped.sha256)) bad.push(mapped.path);
  }
  return { referenced: refs.length, manifest_entries: entries.size, missing: [...new Set(missing)].sort(), hash_mismatches: [...new Set(bad)].sort() };
}

function evaluate(options) {
  for (const file of [options.aggregate, options.dataset, options.oracle, options.rawManifest, options.sourceSnapshot]) if (!fs.existsSync(file)) fail(`missing input: ${file}`);
  const aggregate = readJson(options.aggregate); const dataset = readJsonl(options.dataset); const answerOracle = readJson(options.oracle); const manifest = readJson(options.rawManifest);
  const hashes = { aggregate_sha256: fileHash(options.aggregate), dataset_sha256: fileHash(options.dataset), oracle_sha256: fileHash(options.oracle), raw_manifest_sha256: fileHash(options.rawManifest) };
  const raw = validateRawManifest(manifest, path.dirname(options.rawManifest), aggregate); if (raw.missing.length || raw.hash_mismatches.length) fail(`raw manifest integrity failure: missing=${raw.missing.length}, hash_mismatches=${raw.hash_mismatches.length}`);
  const byId = new Map(dataset.map(item => [item.case_id, item])); const conditions = [];
  for (const entry of aggregate.conditions || []) {
    if (!CONDITIONS.includes(entry.condition) || !entry.artifact || !Array.isArray(entry.artifact.records)) fail("aggregate has invalid condition artifact");
    const cases = [];
    for (const record of entry.artifact.records) { const item = byId.get(record.case_id); if (!item) fail(`aggregate case missing from dataset: ${record.case_id}`); const expected = answerOracle.cases && answerOracle.cases[record.case_id]; if (!expected) fail(`answer oracle case missing: ${record.case_id}`); cases.push({ case_id: record.case_id, extraction: extractionResult(item, record), answer: answerResult(item, record, expected), evidence: { condition: entry.condition, answer_raw: record.answer_request && record.answer_request.raw_output_ref || null, extraction_raw: (record.turn_outputs || []).map(x => x.raw_output_ref).filter(Boolean) } }); }
    const all = cases.flatMap(c => [c.answer.content, c.answer.provenance, c.answer.stale_or_contradictory]);
    const count = status => all.filter(x => x.status === status).length;
    conditions.push({ condition: entry.condition, case_count: cases.length, cases, summary: { content: { pass: cases.filter(c => c.answer.content.status === "pass").length, fail: cases.filter(c => c.answer.content.status === "fail").length, unknown: cases.filter(c => c.answer.content.status === "unknown").length }, provenance: { pass: cases.filter(c => c.answer.provenance.status === "pass").length, fail: cases.filter(c => c.answer.provenance.status === "fail").length, unknown: cases.filter(c => c.answer.provenance.status === "unknown").length }, stale_or_contradictory: { pass: cases.filter(c => c.answer.stale_or_contradictory.status === "pass").length, fail: cases.filter(c => c.answer.stale_or_contradictory.status === "fail").length, unknown: cases.filter(c => c.answer.stale_or_contradictory.status === "unknown").length }, extraction_unknown: cases.reduce((n, c) => n + c.extraction.unknown_count, 0), rubric_status_counts: { pass: count("pass"), fail: count("fail"), unknown: count("unknown") } } });
  }
  return { schema_version: VERSION, artifact_kind: "offline_replay", evaluator_version: VERSION, run_id: manifest.run, evidence_boundary: "post_hoc_computed_historical_replay", input_hashes: hashes, source_snapshot: { path: path.relative(ROOT, options.sourceSnapshot), sha256: fileHash(options.sourceSnapshot) }, frozen_inputs: { aggregate: path.relative(ROOT, options.aggregate), dataset: path.relative(ROOT, options.dataset), oracle: path.relative(ROOT, options.oracle), raw_manifest: path.relative(ROOT, options.rawManifest), raw_integrity: raw }, historical_metadata: { source_commit_claimed: aggregate.source_commit || null, executed_source_identity: "unknown", legacy_scores_retained: true }, conditions, limits: ["No model/provider/network call was made.", "Free text content is evaluated by a deterministic case rubric; this is not an LLM judge.", "Missing answer provenance remains unknown and is not reconstructed from context.", "This post-hoc replay cannot establish a model or Prolog superiority claim."] };
}

function arg(argv, name, fallback) { const prefix = `--${name}=`; const inline = argv.find(x => x.startsWith(prefix)); return inline ? inline.slice(prefix.length) : fallback; }
if (require.main === module) { try { const argv = process.argv.slice(2); const options = { aggregate: arg(argv, "aggregate", DEFAULTS.aggregate), dataset: arg(argv, "dataset", DEFAULTS.dataset), oracle: arg(argv, "oracle", DEFAULTS.oracle), rawManifest: arg(argv, "raw-manifest", DEFAULTS.rawManifest), sourceSnapshot: arg(argv, "source-snapshot", __filename), output: arg(argv, "output", DEFAULTS.output) }; fs.writeFileSync(options.output, `${JSON.stringify(evaluate(options), null, 2)}\n`); console.log(`✓ Wrote ${options.output}`); } catch (error) { console.error(`✗ ${error.code || "OFFLINE_EVAL"}: ${error.message}`); process.exitCode = 1; } }

module.exports = { VERSION, evaluate, extractionResult, answerResult, contentVerdict, normalizeFact, sameContent };
