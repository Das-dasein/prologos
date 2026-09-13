"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const engine = process.env.PROLOG_ENGINE === "swipl"
  ? require("./swipl-engine")
  : require("./prolog-engine");
const { consult, query } = engine;
const {
  ACTIVE_ONTOLOGY,
  MEMORY_PREDICATES,
  canonicalJson,
  validateOntologyCandidateName,
  validateRegistryIdentity,
} = require("./ontology-registry");
const { ACTIVE_GROUNDING_POLICY } = require("./predicate-grounding-policy");

const RELATION_SIGNATURES = MEMORY_PREDICATES;
const RELATIONS = new Set(Object.keys(RELATION_SIGNATURES));
const ATOM = /^[a-z][a-z0-9_]*$/;

function exactObject(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${label} must be an object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index]))
    throw new Error(`${label} has unknown or missing keys`);
}

function validateProposal(proposal, { evidenceRequired = false } = {}) {
  exactObject(proposal, ["polarity", "relation", "arguments", "valid_from", "valid_to", "confidence", ...(evidenceRequired ? ["evidence_span"] : [])], "assertion candidate");
  const signature = RELATION_SIGNATURES[proposal.relation];
  if (!signature) throw new Error(`Relation not allowed: ${proposal.relation}`);
  if (!Array.isArray(proposal.arguments) || proposal.arguments.length !== signature.arity)
    throw new Error(`Bad arity for ${proposal.relation}: expected ${signature.arity}`);
  for (const arg of proposal.arguments) {
    if (typeof arg !== "string" || !ATOM.test(arg))
      throw new Error(`Unsafe atom: ${JSON.stringify(arg)}`);
  }
  if (!["positive", "negative"].includes(proposal.polarity)) throw new Error("Bad polarity");
  for (const value of [proposal.valid_from, proposal.valid_to]) {
    if (value !== null && (!Number.isInteger(value) || value < 10000101 || value > 99991231))
      throw new Error(`Bad date: ${value}`);
  }
  if (typeof proposal.confidence !== "number" || proposal.confidence < 0 || proposal.confidence > 1)
    throw new Error("Confidence must be between 0 and 1");
  if (evidenceRequired && (typeof proposal.evidence_span !== "string" || !proposal.evidence_span.trim() || proposal.evidence_span.length > 2000))
    throw new Error("Assertion evidence span is required");
  return proposal;
}

function validateOntologyCandidate(candidate, registry = ACTIVE_ONTOLOGY) {
  exactObject(candidate, ["name", "arity", "argument_types", "meaning", "evidence_span"], "ontology candidate");
  validateOntologyCandidateName(candidate.name, registry);
  if (!Number.isInteger(candidate.arity) || candidate.arity < 1 || candidate.arity > 4)
    throw new Error(`Bad ontology candidate arity: ${candidate.arity}`);
  if (!Array.isArray(candidate.argument_types) || candidate.argument_types.length !== candidate.arity)
    throw new Error(`Bad ontology candidate argument types for ${candidate.name}`);
  for (const type of candidate.argument_types) {
    if (typeof type !== "string" || !registry.types[type])
      throw new Error(`Unknown ontology candidate argument type: ${type}`);
  }
  if (typeof candidate.meaning !== "string" || !candidate.meaning.trim() || candidate.meaning.length > 500)
    throw new Error("Ontology candidate meaning is required");
  if (typeof candidate.evidence_span !== "string" || !candidate.evidence_span.trim() || candidate.evidence_span.length > 2000)
    throw new Error("Ontology candidate evidence span is required");
  return candidate;
}

function validateExtraction(extraction) {
  const isDecision = extraction && ["memory-extraction-v4", "memory-extraction-v5"].includes(extraction.schema_version);
  const isV5 = extraction && extraction.schema_version === "memory-extraction-v5";
  exactObject(extraction, ["schema_version", "registry_identity", ...(isV5 ? ["policy_identity"] : []), "assertions", "ontology_candidates", ...(isDecision ? ["decision", "clarification"] : [])], "memory extraction");
  if (!["memory-extraction-v2", "memory-extraction-v3", "memory-extraction-v4", "memory-extraction-v5"].includes(extraction.schema_version))
    throw new Error(`Unsupported memory extraction schema: ${extraction.schema_version}`);
  exactObject(extraction.registry_identity, ["name", "version", "sha256"], "registry identity");
  validateRegistryIdentity(extraction.registry_identity);
  if (isV5) {
    exactObject(extraction.policy_identity, ["name", "version", "sha256"], "grounding policy identity");
    if (canonicalJson(extraction.policy_identity) !== canonicalJson(ACTIVE_GROUNDING_POLICY.identity)) throw new Error("Grounding policy identity mismatch");
  }
  if (!Array.isArray(extraction.assertions) || !Array.isArray(extraction.ontology_candidates))
    throw new Error("Memory extraction collections must be arrays");
  if (extraction.assertions.length > 100 || extraction.ontology_candidates.length > 50)
    throw new Error("Memory extraction exceeds collection limits");
  extraction.assertions.forEach(proposal => validateProposal(proposal, { evidenceRequired: extraction.schema_version !== "memory-extraction-v2" }));
  extraction.ontology_candidates.forEach(candidate => validateOntologyCandidate(candidate));
  if (isDecision) {
    if (!["write", "ignore", "clarify", "ontology_candidate"].includes(extraction.decision))
      throw new Error("Bad extraction decision");
    const clarification = extraction.clarification;
    if (clarification !== null) {
      exactObject(clarification, ["question", "evidence_span"], "clarification");
      if (typeof clarification.question !== "string" || !clarification.question.trim() || clarification.question.length > 500)
        throw new Error("Clarification question is required");
      if (typeof clarification.evidence_span !== "string" || !clarification.evidence_span.trim() || clarification.evidence_span.length > 2000)
        throw new Error("Clarification evidence span is required");
    }
    if (extraction.decision === "write" && (!extraction.assertions.length || clarification !== null)) throw new Error("Invalid write decision payload");
    if (extraction.decision === "ignore" && (extraction.assertions.length || extraction.ontology_candidates.length || clarification !== null)) throw new Error("Invalid ignore decision payload");
    if (extraction.decision === "clarify" && (extraction.assertions.length || extraction.ontology_candidates.length || clarification === null)) throw new Error("Invalid clarify decision payload");
    if (extraction.decision === "ontology_candidate" && (extraction.assertions.length || !extraction.ontology_candidates.length || clarification !== null)) throw new Error("Invalid ontology_candidate decision payload");
  }
  return extraction;
}

function nextId() {
  return `c_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
}

function toFact(proposal, messageId) {
  validateProposal(proposal);
  if (typeof messageId !== "string" || !ATOM.test(messageId))
    throw new Error(`Unsafe message ID: ${JSON.stringify(messageId)}`);
  const id = nextId();
  const term = `${proposal.relation}(${proposal.arguments.join(",")})`;
  const from = proposal.valid_from ?? 10000101;
  const to = proposal.valid_to ?? "inf";
  return {
    id,
    text: [
      `assertion(${id}, ${term}).`,
      `assertion_status(${id}, accepted).`,
      `assertion_polarity(${id}, ${proposal.polarity}).`,
      `assertion_modality(${id}, asserted).`,
      `assertion_time(${id}, interval(${from}, ${to})).`,
      `assertion_source(${id}, user_message(${messageId})).`,
      `assertion_confidence(${id}, ${proposal.confidence}).`,
    ].join("\n"),
  };
}

class MemoryStore {
  constructor(memoryPath = path.join("data", "memory.pl")) {
    this.memoryPath = memoryPath;
    fs.mkdirSync(path.dirname(memoryPath), { recursive: true });
    if (!fs.existsSync(memoryPath)) fs.writeFileSync(memoryPath, "% Persistent claims\n", "utf8");
  }

  read() { return fs.readFileSync(this.memoryPath, "utf8"); }

  async add(extraction, messageId) {
    const checked = validateExtraction(extraction);
    const facts = checked.assertions.map(candidate => {
      const { evidence_span: _evidenceSpan, ...proposal } = candidate;
      return toFact(proposal, messageId);
    });
    if (!facts.length) return { facts: [], conflicts: [], ontology_candidates: checked.ontology_candidates };
    const rules = fs.readFileSync("memory.pl", "utf8");
    const domainRules = fs.readFileSync("domain-rules.pl", "utf8");
    const candidate = this.read() + "\n" + facts.map(fact => fact.text).join("\n") + "\n";
    const session = await consult(rules + "\n" + domainRules + "\n" + candidate);
    const all = await query(session, "conflict_explanation(Type, Id1, Id2, Explanation).");
    const ids = new Set(facts.map(fact => fact.id));
    const conflicts = all.filter(answer => [...ids].some(id => answer.includes(id)));
    fs.appendFileSync(this.memoryPath, facts.map(fact => fact.text).join("\n") + "\n", "utf8");
    return { facts, conflicts, ontology_candidates: checked.ontology_candidates };
  }
}

module.exports = {
  MemoryStore,
  validateExtraction,
  validateOntologyCandidate,
  validateProposal,
  toFact,
  RELATIONS,
  RELATION_SIGNATURES,
};
