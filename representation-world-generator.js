"use strict";

// Offline fixture construction for representation-formalization-v1.  Prompt
// assembly is intentionally pure: the oracle is invoked only by generateFixture
// after both provider-facing prompts have already been constructed.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const SCHEMA_VERSION = "representation-world-fixture-v1";
const DEFAULT_SEED = "representation-world-v1-20260906";
const DEPTHS = [1, 3, 5];
const TOPOLOGIES = ["chain", "join"];
const EXPECTED = ["entailed", "unknown"];
const REPLICAS = [1, 2];
const ANSWER_INSTRUCTION = "Answer with exactly one line: RESULT: entailed or RESULT: unknown. Use unknown only when the question is not derivable from the supplied facts and rules.";
const QUESTION_PREFIX = "Question: Is ";
const FORBIDDEN_PUBLIC_FIELDS = ["oracle", "expected", "proof", "engine", "tool", "trusted_result", "answer_result"];

const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const stable = value => JSON.stringify(value, null, 2) + "\n";

function deterministicIndex(seed, key, length) {
  return parseInt(sha256(`${seed}:${key}`).slice(0, 8), 16) % length;
}

function atomFor(seed, key, values) {
  return values[deterministicIndex(seed, key, values.length)];
}

function term(predicate, argument) { return { predicate, args: [argument] }; }
function fact(predicate, argument) { return term(predicate, argument); }
function rule(head, body) { return { head, body }; }

function prologTerm(item) { return `${item.predicate}(${item.args.join(",")})`; }
function prologRule(item) { return `${prologTerm(item.head)} :- ${item.body.map(prologTerm).join(", ")}.`; }

function predicateLexicon(depth) {
  const stages = ["calm", "focused", "prepared", "reliable", "ready"];
  return stages.slice(0, depth).map((name, index) => ({ atom: `stage_${index + 1}`, adjective: name }));
}

function caseIdentity({ depth, topology, expected, replica }) {
  return `rw-d${depth}-${topology}-${expected}-r${replica}`;
}

function sourceWorld({ seed, depth, topology, expected, replica }) {
  const id = caseIdentity({ depth, topology, expected, replica });
  const subject = atomFor(seed, `${id}:subject`, ["aria", "boris", "cora", "dani", "elin", "finn"]);
  const distractor = atomFor(seed, `${id}:distractor`, ["gala", "hugo", "iris", "juno", "kian", "lena"]);
  const stages = predicateLexicon(depth);
  const facts = [], rules = [];
  if (topology === "chain") {
    facts.push(fact("source", expected === "entailed" ? subject : distractor));
    for (let index = 0; index < depth; index += 1) {
      const predecessor = index === 0 ? "source" : stages[index - 1].atom;
      rules.push(rule(term(stages[index].atom, "X"), [term(predecessor, "X")]));
    }
  } else {
    // The first rule is deliberately conjunctive: both antecedents use X.
    facts.push(fact("source", subject));
    facts.push(fact("marker", expected === "entailed" ? subject : distractor));
    rules.push(rule(term(stages[0].atom, "X"), [term("source", "X"), term("marker", "X")]));
    for (let index = 1; index < depth; index += 1) {
      rules.push(rule(term(stages[index].atom, "X"), [term(stages[index - 1].atom, "X")]));
    }
  }
  return Object.freeze({
    facts: Object.freeze(facts.map(Object.freeze)),
    rules: Object.freeze(rules.map(item => Object.freeze({ head: Object.freeze(item.head), body: Object.freeze(item.body.map(Object.freeze)) }))),
    query: Object.freeze(term(stages.at(-1).atom, subject)),
    vocabulary: Object.freeze({ subject, distractor, stages: Object.freeze(stages.map(Object.freeze)) }),
  });
}

function noun(argument) { return argument[0].toUpperCase() + argument.slice(1); }
function predicateDescription(predicate) {
  if (predicate === "source") return "a source trait";
  if (predicate === "marker") return "a marker trait";
  const stage = /^stage_(\d+)$/.exec(predicate);
  if (!stage) throw new Error(`unknown predicate: ${predicate}`);
  return predicateLexicon(5)[Number(stage[1]) - 1].adjective;
}

function naturalFact(item) { return `${noun(item.args[0])} has ${predicateDescription(item.predicate)}.`; }
function naturalRule(item) {
  const antecedents = item.body.map(part => `someone has ${predicateDescription(part.predicate)}`).join(" and ");
  return `If ${antecedents}, then that person is ${predicateDescription(item.head.predicate)}.`;
}

function renderNatural(world) {
  return ["Facts:", ...world.facts.map(naturalFact), "Rules:", ...world.rules.map(naturalRule)].join("\n");
}

function renderProlog(world) {
  return [...world.facts.map(item => `${prologTerm(item)}.`), ...world.rules.map(prologRule)].join("\n");
}

function naturalQuestion(query) { return `${noun(query.args[0])} ${predicateDescription(query.predicate)}?`; }

// This function is intentionally synchronous and has no oracle argument or
// dependency.  It is the only function allowed to assemble provider text.
function assemblePromptPair(world) {
  const sharedPrefix = "You are given a finite rule world.\n";
  const question = `${QUESTION_PREFIX}${naturalQuestion(world.query)}\n`;
  const sharedSuffix = `${ANSWER_INSTRUCTION}\n`;
  const p0Representation = renderNatural(world);
  const p1Representation = renderProlog(world);
  return Object.freeze({
    p0: `${sharedPrefix}${p0Representation}\n${question}${sharedSuffix}`,
    p1: `${sharedPrefix}${p1Representation}\n${question}${sharedSuffix}`,
    public: Object.freeze({ question, answer_instruction: ANSWER_INSTRUCTION }),
  });
}

function formalProgram(world) {
  return `${renderProlog(world)}\n`;
}

async function runPrologOracle(world) {
  // Delayed import makes the construction boundary mechanically visible: no
  // adapter can be reached until a caller explicitly invokes this scorer.
  const { consult, query } = require("./prolog-engine");
  const session = await consult(formalProgram(world));
  const answers = await query(session, `${prologTerm(world.query)}.`);
  return Object.freeze({ label: answers.length > 0 ? "entailed" : "unknown" });
}

function publicCase({ seed, depth, topology, expected, replica, world, pair }) {
  return Object.freeze({
    case_id: caseIdentity({ depth, topology, expected, replica }),
    seed,
    stratum: Object.freeze({ depth, topology, replica }),
    formal_world: Object.freeze({
      facts: world.facts,
      rules: world.rules,
      query: world.query,
    }),
    renderings: Object.freeze({ p0: renderNatural(world), p1: renderProlog(world) }),
    prompts: Object.freeze({ p0: pair.p0, p1: pair.p1 }),
  });
}

function validatePublicPrompt(prompt) {
  for (const field of FORBIDDEN_PUBLIC_FIELDS) {
    if (new RegExp(`\\b${field}\\b`, "i").test(prompt)) throw new Error(`provider prompt contains forbidden field marker: ${field}`);
  }
  if (/runTrustedQuery|runPrologOracle|SWI-Prolog/i.test(prompt)) throw new Error("provider prompt exposes an oracle capability");
  return true;
}

function validateCoverage(cases) {
  if (!Array.isArray(cases) || cases.length !== 24) throw new Error("fixture must contain exactly 24 cases");
  const seen = new Set();
  for (const item of cases) {
    const { depth, topology, replica } = item.stratum;
    const label = item.oracle && item.oracle.label;
    if (!DEPTHS.includes(depth) || !TOPOLOGIES.includes(topology) || !EXPECTED.includes(label) || !REPLICAS.includes(replica)) throw new Error(`invalid case stratum: ${item.case_id}`);
    const key = `${depth}:${topology}:${label}:${replica}`;
    if (seen.has(key)) throw new Error(`duplicate stratum: ${key}`);
    seen.add(key);
  }
  if (seen.size !== 24) throw new Error("incomplete Cartesian stratum coverage");
  return true;
}

async function generateFixture({ seed = DEFAULT_SEED } = {}) {
  if (typeof seed !== "string" || !seed) throw new Error("seed must be non-empty text");
  const cases = [];
  for (const depth of DEPTHS) for (const topology of TOPOLOGIES) for (const expected of EXPECTED) for (const replica of REPLICAS) {
    const world = sourceWorld({ seed, depth, topology, expected, replica });
    const pair = assemblePromptPair(world);
    validatePublicPrompt(pair.p0); validatePublicPrompt(pair.p1);
    const oracle = await runPrologOracle(world);
    if (oracle.label !== expected) throw new Error(`oracle mismatch for ${caseIdentity({ depth, topology, expected, replica })}: expected ${expected}, got ${oracle.label}`);
    cases.push(Object.freeze({ ...publicCase({ seed, depth, topology, expected, replica, world, pair }), oracle }));
  }
  validateCoverage(cases);
  return Object.freeze({ schema_version: SCHEMA_VERSION, generator_version: "1", seed, cases: Object.freeze(cases) });
}

function writeFixture(file, fixture) {
  const bytes = stable(fixture);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, bytes, "utf8");
  return Object.freeze({ file: path.resolve(file), sha256: sha256(bytes), bytes: Buffer.byteLength(bytes) });
}

function parseArgs(argv) {
  const result = { seed: DEFAULT_SEED, output: path.join(__dirname, ".cdr/waves/representation-formalization-v1/representation-world-fixture-v1.json") };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--seed" && argv[index + 1]) result.seed = argv[++index];
    else if (token === "--output" && argv[index + 1]) result.output = argv[++index];
    else throw new Error("usage: representation-world-generator.js [--seed SEED] [--output FILE]");
  }
  return result;
}

module.exports = { ANSWER_INSTRUCTION, DEFAULT_SEED, DEPTHS, EXPECTED, FORBIDDEN_PUBLIC_FIELDS, REPLICAS, SCHEMA_VERSION, TOPOLOGIES, assemblePromptPair, formalProgram, generateFixture, parseArgs, renderNatural, renderProlog, runPrologOracle, sourceWorld, stable, validateCoverage, validatePublicPrompt, writeFixture };

if (require.main === module) {
  (async () => {
    const options = parseArgs(process.argv.slice(2));
    const fixture = await generateFixture({ seed: options.seed });
    const written = writeFixture(options.output, fixture);
    console.log(JSON.stringify({ status: "ok", case_count: fixture.cases.length, seed: fixture.seed, ...written }));
  })().catch(error => { console.error(`representation-world-generator: ${error.stack || error.message}`); process.exitCode = 1; });
}
