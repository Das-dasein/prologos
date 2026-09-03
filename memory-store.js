const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const engine = process.env.PROLOG_ENGINE === "swipl"
  ? require("./swipl-engine")
  : require("./prolog-engine");
const { consult, query } = engine;

const RELATIONS = new Set([
  "likes", "dislikes", "lives_in", "works_at", "studies_at", "role",
  "birth_year", "email", "prefers", "owns", "uses", "interested_in",
  "previous_project",
  "role_at_semester", "role_before_semester",
  "project_role_at", "current_project_at",
  "knows_technology",
  "worked_with_technology",
]);
const ATOM = /^[a-z][a-z0-9_]*$/;

function validateProposal(p) {
  if (!RELATIONS.has(p.relation)) throw new Error(`Relation not allowed: ${p.relation}`);
  if (!Array.isArray(p.arguments) || p.arguments.length < 1 || p.arguments.length > 4)
    throw new Error("A proposition needs 1-4 arguments");
  for (const arg of p.arguments) {
    if (typeof arg !== "string" || !ATOM.test(arg))
      throw new Error(`Unsafe atom: ${JSON.stringify(arg)}`);
  }
  if (!["positive", "negative"].includes(p.polarity)) throw new Error("Bad polarity");
  for (const value of [p.valid_from, p.valid_to]) {
    if (value !== null && (!Number.isInteger(value) || value < 10000101 || value > 99991231))
      throw new Error(`Bad date: ${value}`);
  }
  if (typeof p.confidence !== "number" || p.confidence < 0 || p.confidence > 1)
    throw new Error("Confidence must be between 0 and 1");
}

function nextId() {
  return `c_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
}

function toFact(proposal, messageId) {
  validateProposal(proposal);
  const id = nextId();
  const term = `${proposal.relation}(${proposal.arguments.join(",")})`;
  const from = proposal.valid_from ?? 10000101;
  const to = proposal.valid_to ?? "inf";
  return {
    id,
    text: [
      `assertion(${id}, ${term}).`,
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

  async add(proposals, messageId) {
    const facts = proposals.map(p => toFact(p, messageId));
    if (!facts.length) return { facts: [], conflicts: [] };
    const rules = fs.readFileSync("memory.pl", "utf8");
    const domainRules = fs.readFileSync("domain-rules.pl", "utf8");
    const candidate = this.read() + "\n" + facts.map(f => f.text).join("\n") + "\n";
    const session = await consult(rules + "\n" + domainRules + "\n" + candidate);
    const all = await query(session, "conflict_explanation(Type, Id1, Id2, Explanation).");
    const ids = new Set(facts.map(f => f.id));
    const conflicts = all.filter(answer => [...ids].some(id => answer.includes(id)));
    fs.appendFileSync(this.memoryPath, facts.map(f => f.text).join("\n") + "\n", "utf8");
    return { facts, conflicts };
  }
}

module.exports = { MemoryStore, validateProposal, toFact, RELATIONS };
