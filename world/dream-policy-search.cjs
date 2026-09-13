#!/usr/bin/env node
"use strict";

// Bounded executable check that optional dream selection never removes the
// ordinary next move in a small signed-Horn basis. This is a finite search,
// not a theorem about arbitrary programs or question policies.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const assert = require("node:assert/strict");
const { WorldAgent } = require("./agent");

const COMPONENTS = [
  ["p", "p(orion)."], ["neg_p", "neg(p(orion))."], ["q", "q(orion)."], ["neg_q", "neg(q(orion))."],
  ["rule_p", "release(X) :- p(X)."], ["rule_q", "release(X) :- q(X)."], ["rule_pq", "release(X) :- p(X), q(X)."]
];
const QUESTION_SETS = [[], ["p"], ["q"], ["p", "q"]];
const IDEAS = { version: "dream-policy-search-v1", predicates: [{ name: "release", arity: 1 }, { name: "p", arity: 1 }, { name: "q", arity: 1 }] };
const sha = value => crypto.createHash("sha256").update(typeof value === "string" || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest("hex");

function projection(decision) {
  return decision.kind === "ask"
    ? { kind: "ask", target: decision.question.literal }
    : decision.kind === "act" ? { kind: "act", target: decision.action }
    : { kind: decision.kind, reason: decision.reason };
}
function selected(mask, components = COMPONENTS) { return components.filter((_, index) => (mask & (2 ** index)) !== 0); }
function questions(names) { return names.map(name => ({ id: name, text: `${name}?`, literal: `${name}(orion)`, cost: 1 })); }
async function run(programs, questionNames, strategy, directory) {
  const agent = new WorldAgent(directory, { agent_id: `search_${strategy}`, ideas: IDEAS, startTime: 0 });
  if (programs.length) {
    const source = agent.observe(programs.join("\n"), { at: 1, kind: "bounded_search" });
    const proposal = agent.propose(source, programs.map(([id, program]) => ({ id, program })), { at: 1, interpretation: "bounded search fixture" });
    await agent.admit(proposal, { admit: true, by: "bounded_search", reason: "synthetic fixture; no truth claim" });
  }
  await agent.startGoal({ id: "goal", text: "bounded release goal", query: "release(orion)", action: "release(orion)", questions: questions(questionNames) });
  const decision = await agent.step({ strategy });
  return { decision, reflection: agent.state().goal.reflection };
}
async function search({ components = COMPONENTS, questionSets = QUESTION_SETS } = {}) {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "dream-policy-search-")), cases = [];
  try {
    for (let mask = 0; mask < 2 ** components.length; mask++) for (const questionNames of questionSets) {
      const programs = selected(mask, components), key = `${mask}_${questionNames.join("_") || "none"}`;
      const missing = await run(programs, questionNames, "missing", path.join(temporary, key, "missing"));
      const dream = await run(programs, questionNames, "dream", path.join(temporary, key, "dream"));
      const left = projection(missing.decision), right = projection(dream.decision);
      cases.push({ mask, components: programs.map(([id]) => id), questions: questionNames, missing: left, dream: right, equal: JSON.stringify(left) === JSON.stringify(right), dream_dispositions: dream.reflection.questions.map(entry => ({ id: entry.question.id, disposition: entry.disposition })) });
    }
  } finally { fs.rmSync(temporary, { recursive: true, force: true }); }
  const differences = cases.filter(row => !row.equal);
  return { basis: { components: components.map(([id, program]) => ({ id, program })), question_sets: questionSets }, cases, summary: { total: cases.length, equal: cases.length - differences.length, differences: differences.length }, witnesses: differences.slice(0, 16) };
}
function outputPath(argv) { if (argv.length !== 2 || argv[0] !== "--out" || !argv[1]) throw new Error("Usage: dream-policy-search.cjs --out NEW_REPORT.json"); return path.resolve(argv[1]); }
async function main() {
  const out = outputPath(process.argv.slice(2)); if (fs.existsSync(out)) throw new Error("refusing to overwrite receipt");
  const result = await search();
  const receipt = { version: "dream-policy-bounded-search-v3", status: "completed", boundary: "Exhaustive finite search over a stated 7-component signed-Horn basis and four declared question sets. It is not a theorem about arbitrary programs, values, source trust, extraction, or model behavior.", source_sha256: { search: sha(fs.readFileSync(__filename)), agent: sha(fs.readFileSync(path.join(__dirname, "agent.js"))), checker: sha(fs.readFileSync(path.join(__dirname, "checker.pl"))) }, ...result };
  fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, JSON.stringify(receipt, null, 2) + "\n");
  process.stdout.write(JSON.stringify({ out, ...receipt.summary }) + "\n");
}
if (require.main === module) main().catch(error => { process.stderr.write(error.stack + "\n"); process.exitCode = 1; });
module.exports = { COMPONENTS, QUESTION_SETS, projection, search };
