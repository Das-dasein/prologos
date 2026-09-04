"use strict";

// Deterministic, bounded rule challenge. This module evaluates only a declared
// hypothesis over named source assertions; it never writes memory or a registry.
const crypto = require("node:crypto");
const fs = require("node:fs");
const { ReflectionHypothesis } = require("./llm-schema");
const { createPredicateRegistry, validateProposal, run } = require("./ontology-harness");

const ATOM = /^[a-z][a-z0-9_]*$/;
const VARIABLE = /^[A-Z][A-Za-z0-9_]*$/;

function sha256(value) { return crypto.createHash("sha256").update(value).digest("hex"); }
function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
function parseTerms(memory) {
  const records = new Map();
  const assertion = /assertion\(([^,\s]+),\s*([a-z][a-z0-9_]*)\(([^()]*)\)\)\./g;
  let match;
  while ((match = assertion.exec(memory))) {
    const args = match[3] === "" ? [] : match[3].split(",").map(x => x.trim());
    if (args.length && args.every(x => ATOM.test(x))) records.set(match[1], { id: match[1], predicate: match[2], arguments: args });
  }
  const polarity = /assertion_polarity\(([^,\s]+),\s*(positive|negative)\)\./g;
  while ((match = polarity.exec(memory))) { const r = records.get(match[1]); if (r) r.polarity = match[2]; }
  const status = /assertion_status\(([^,\s]+),\s*([a-z_]+)\)\./g;
  while ((match = status.exec(memory))) { const r = records.get(match[1]); if (r) r.status = match[2]; }
  const reviewed = /assertion_status_event\(([^,\s]+),\s*reviewed\)\./g;
  while ((match = reviewed.exec(memory))) { const r = records.get(match[1]); if (r) r.reviewed = true; }
  const revision = /assertion_revision\(([^,\s]+),\s*replaces,\s*([^,\s]+)\)\./g;
  while ((match = revision.exec(memory))) { const r = records.get(match[2]); if (r) r.superseded = true; }
  for (const r of records.values()) {
    r.status = r.superseded ? "superseded" : (r.reviewed ? "reviewed" : (r.status || "accepted"));
    r.conflicted = [...records.values()].some(other => other.id !== r.id && !other.superseded && other.predicate === r.predicate && same(other.arguments, r.arguments) && other.polarity && r.polarity && other.polarity !== r.polarity);
  }
  return records;
}

function same(a, b) { return a.length === b.length && a.every((x, i) => x === b[i]); }
function safeSupport(record) { return record && record.polarity === "positive" && record.status === "accepted" && !record.conflicted; }
function unify(term, fact, bindings) {
  if (term.predicate !== fact.predicate || term.arguments.length !== fact.arguments.length) return null;
  const next = { ...bindings };
  for (let i = 0; i < term.arguments.length; i++) {
    const value = term.arguments[i];
    if (VARIABLE.test(value)) { if (next[value] && next[value] !== fact.arguments[i]) return null; next[value] = fact.arguments[i]; }
    else if (value !== fact.arguments[i]) return null;
  }
  return next;
}
function derive(rule, facts) {
  let bindings = [{}];
  for (const goal of rule.body) {
    bindings = bindings.flatMap(binding => facts.map(fact => unify(goal, fact, binding)).filter(Boolean));
  }
  const out = new Map();
  for (const binding of bindings) {
    const arguments_ = rule.head.arguments.map(a => VARIABLE.test(a) ? binding[a] : a);
    if (arguments_.some(x => !ATOM.test(x))) continue;
    const value = { predicate: rule.head.predicate, arguments: arguments_ };
    out.set(`${value.predicate}(${value.arguments.join(",")})`, value);
  }
  return [...out.values()].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}
function decisionResult(h, sourceHash, decision, supporting, refuting, candidate = null) {
  return {
    schema_version: "elenchus-result-v1", hypothesis_id: h.hypothesis_id,
    registry_identity: h.registry_identity, source_snapshot_sha256: sourceHash,
    decision, supporting_assertion_ids: [...supporting].sort(),
    refuting_assertion_ids: [...refuting].sort(), candidate,
  };
}
function malformedResult(input, sourceHash, error) {
  const candidateIdentity = input && input.registry_identity;
  const registryIdentity = candidateIdentity && typeof candidateIdentity === "object" && !Array.isArray(candidateIdentity)
    ? { name: typeof candidateIdentity.name === "string" ? candidateIdentity.name : null, version: typeof candidateIdentity.version === "string" ? candidateIdentity.version : null, sha256: typeof candidateIdentity.sha256 === "string" ? candidateIdentity.sha256 : null }
    : null;
  return {
    schema_version: "elenchus-result-v1", hypothesis_id: input && typeof input.hypothesis_id === "string" ? input.hypothesis_id : null,
    registry_identity: registryIdentity, source_snapshot_sha256: sourceHash,
    decision: "rejected", error: { code: "HYPOTHESIS_INVALID", message: error.message },
    supporting_assertion_ids: [], refuting_assertion_ids: [], candidate: null,
  };
}
function validateHypothesis(input) {
  const h = ReflectionHypothesis.parse(input);
  if (new Set(h.supporting_assertion_ids).size !== h.supporting_assertion_ids.length) throw new Error("Elenchus: duplicate supporting assertion ID");
  const registry = createPredicateRegistry(h.registry);
  if (h.registry.version !== h.registry_identity.version) throw new Error("Elenchus: registry version identity mismatch");
  const computed = sha256(canonicalJson(h.registry));
  if (computed !== h.registry_identity.sha256) throw new Error("Elenchus: registry hash identity mismatch");
  validateProposal({ schema_version: "ontology-proposal-v0", candidate_version: `cand-${h.hypothesis_id.slice(2)}`, registry: h.registry, facts: [], rules: [h.rule] }, registry);
  return h;
}
async function evaluateHypothesis(input, { memoryPath = process.env.MEMORY_FILE || "data/memory.pl" } = {}) {
  const memory = fs.readFileSync(memoryPath, "utf8"), sourceHash = sha256(memory);
  let h;
  try { h = validateHypothesis(input); }
  catch (error) { return malformedResult(input, sourceHash, error); }
  const records = parseTerms(memory);
  const support = h.supporting_assertion_ids.map(id => records.get(id));
  if (support.some(x => !x)) return decisionResult(h, sourceHash, "rejected", h.supporting_assertion_ids, [], null);
  if (support.some(x => !safeSupport(x))) return decisionResult(h, sourceHash, "conflicted", h.supporting_assertion_ids, support.filter(x => !safeSupport(x)).map(x => x.id), null);
  const facts = support.map(record => ({ predicate: record.predicate, arguments: record.arguments }));
  const conclusions = derive(h.rule, facts);
  if (!conclusions.length) return decisionResult(h, sourceHash, "insufficient_evidence", h.supporting_assertion_ids, [], null);
  const refuting = [...records.values()].filter(r => !r.superseded && r.polarity === "negative" && conclusions.some(c => c.predicate === r.predicate && same(c.arguments, r.arguments))).map(r => r.id);
  if (refuting.length) return decisionResult(h, sourceHash, "rejected", h.supporting_assertion_ids, refuting, null);
  const candidate = await run({ schema_version: "ontology-proposal-v0", candidate_version: `cand-${h.hypothesis_id.slice(2)}`, registry: h.registry, facts, rules: [h.rule] }, { query: "derived", parameters: [] });
  return decisionResult(h, sourceHash, candidate.status === "ok" ? "accepted" : "rejected", h.supporting_assertion_ids, [], candidate);
}

module.exports = { evaluateHypothesis, validateHypothesis, parseTerms, derive, canonicalJson };
