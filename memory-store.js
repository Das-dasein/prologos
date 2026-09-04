const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const engine = process.env.PROLOG_ENGINE === "swipl"
  ? require("./swipl-engine")
  : require("./prolog-engine");
const { consult, query } = engine;

const RELATION_SIGNATURES = Object.freeze({
  likes: { arity: 2, meaning: "person's positive or negative preference for a thing" },
  lives_in: { arity: 2, meaning: "person lives in place" },
  works_at: { arity: 2, meaning: "person works at organization" },
  studies_at: { arity: 2, meaning: "person studies at organization" },
  role: { arity: 2, meaning: "entity has role" },
  birth_year: { arity: 2, meaning: "person has year of birth" },
  email: { arity: 2, meaning: "entity has email address atom" },
  prefers: { arity: 2, meaning: "person prefers thing" },
  owns: { arity: 2, meaning: "entity owns thing" },
  uses: { arity: 2, meaning: "entity uses thing" },
  interested_in: { arity: 2, meaning: "person is interested in thing or activity" },
  previous_project: { arity: 2, meaning: "person previously worked on project" },
  role_at_semester: { arity: 4, meaning: "person, organization, role, semester" },
  role_before_semester: { arity: 4, meaning: "person, organization, role, semester" },
  project_role_at: { arity: 4, meaning: "person, organization, project, role" },
  current_project_at: { arity: 3, meaning: "person, organization, project" },
  knows_technology: { arity: 2, meaning: "person knows technology" },
  worked_with_technology: { arity: 2, meaning: "person worked with technology" },
});
const RELATIONS = new Set(Object.keys(RELATION_SIGNATURES));
const ATOM = /^[a-z][a-z0-9_]*$/;

function validateProposal(p) {
  if (!RELATIONS.has(p.relation)) throw new Error(`Relation not allowed: ${p.relation}`);
  if (!Array.isArray(p.arguments) || p.arguments.length !== RELATION_SIGNATURES[p.relation].arity)
    throw new Error(`Bad arity for ${p.relation}: expected ${RELATION_SIGNATURES[p.relation].arity}`);
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

module.exports = { MemoryStore, validateProposal, toFact, RELATIONS, RELATION_SIGNATURES };
