"use strict";

// Builds a small, reproducible ProverQA-hard fixture without making any model
// or solver call. P1 is a lossless Prolog-term carrier for full FOL syntax;
// it is intentionally not represented as executable Horn clauses.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const SOURCE_SCHEMA = "proverqa-hard-source-manifest-v1";
const FIXTURE_SCHEMA = "proverqa-hard-hybrid-fixture-v1";
const DEFAULT_SEED = "proverqa-hard-hybrid-v1-20260907";
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const stable = value => JSON.stringify(value, null, 2) + "\n";

function stripOuter(value) {
  let text = value.trim();
  while (text.startsWith("(") && text.endsWith(")")) {
    let depth = 0, closesEarly = false;
    for (let index = 0; index < text.length; index += 1) {
      if (text[index] === "(") depth += 1;
      if (text[index] === ")") depth -= 1;
      if (depth === 0 && index !== text.length - 1) { closesEarly = true; break; }
    }
    if (closesEarly || depth !== 0) break;
    text = text.slice(1, -1).trim();
  }
  return text;
}

function topLevelOperator(text, operator) {
  let depth = 0;
  for (let index = 0; index <= text.length - operator.length; index += 1) {
    if (text[index] === "(") depth += 1;
    else if (text[index] === ")") depth -= 1;
    else if (depth === 0 && text.slice(index, index + operator.length) === operator) return index;
  }
  return -1;
}

function prologAtom(value) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) throw new Error(`unsupported atom token: ${value}`);
  return /^[a-z]$/.test(value) ? value.toUpperCase() : `'${value.replace(/'/g, "''")}'`;
}

function parseFol(input) {
  const text = stripOuter(input);
  const quantifier = text.match(/^([∀∃])([a-z])\s+(.+)$/u);
  if (quantifier) return `${quantifier[1] === "∀" ? "forall" : "exists"}(${quantifier[2].toUpperCase()}, ${parseFol(quantifier[3])})`;
  if (text.startsWith("¬")) return `neg(${parseFol(text.slice(1))})`;
  for (const [symbol, name] of [["→", "implies"], ["⊕", "xor"], ["∨", "or"], ["∧", "and"]]) {
    const index = topLevelOperator(text, symbol);
    if (index >= 0) return `${name}(${parseFol(text.slice(0, index))}, ${parseFol(text.slice(index + symbol.length))})`;
  }
  const atom = text.match(/^([A-Za-z_][A-Za-z0-9_]*)\((.*)\)$/);
  if (!atom) throw new Error(`unsupported FOL expression: ${input}`);
  const args = atom[2].split(",").map(value => prologAtom(value.trim()));
  return `atom(${atom[1]}(${args.join(", ")}))`;
}

function ranked(rows, seed) {
  return [...rows].sort((left, right) => sha256(`${seed}:${left.id}`).localeCompare(sha256(`${seed}:${right.id}`)) || left.id - right.id);
}

function selectRows(rows, seed) {
  const byAnswer = new Map(["A", "B", "C"].map(answer => [answer, ranked(rows.filter(row => row.answer === answer), seed)]));
  if ([...byAnswer.values()].some(group => group.length < 4)) throw new Error("source cannot supply four records for every answer class");
  const selected = [];
  const hybridIds = new Set();
  for (const [answer, group] of byAnswer) {
    const quantified = group.filter(row => Object.values(row.nl2fol).some(formula => formula.includes("∀")));
    if (quantified.length < 2) throw new Error(`source cannot supply two quantified ${answer} cases`);
    const hybrid = quantified.slice(0, 2);
    for (const row of hybrid) hybridIds.add(row.id);
    const remainder = group.filter(row => !hybrid.includes(row)).slice(0, 2);
    selected.push(...hybrid, ...remainder);
  }
  selected.sort((a, b) => a.id - b.id);
  if (hybridIds.size !== 6) throw new Error("selection lost its six quantified hybrid cases");
  return { selected, hybridIds };
}

function buildFixture({ sourceBytes, sourceManifest, seed = DEFAULT_SEED }) {
  if (!sourceManifest || sourceManifest.schema_version !== SOURCE_SCHEMA) throw new Error(`source manifest must use ${SOURCE_SCHEMA}`);
  const rows = JSON.parse(sourceBytes);
  if (!Array.isArray(rows) || rows.length !== 500) throw new Error("ProverQA hard source must be a 500-row JSON array");
  const sourceHash = sha256(sourceBytes);
  if (sourceManifest.expected_sha256 !== "TO_BE_PINNED_BY_PREFLIGHT" && sourceManifest.expected_sha256 !== sourceHash) throw new Error("source bytes do not match pinned source hash");
  const { selected, hybridIds } = selectRows(rows, seed);
  const cases = selected.map(row => {
    const formulas = Object.entries(row.nl2fol).map(([english, fol], index) => ({ index: index + 1, english, fol, prolog_term: parseFol(fol) }));
    const queryTerm = parseFol(row.conclusion_fol);
    return {
      case_id: `proverqa-hard-${row.id}`,
      source_id: row.id,
      source_answer: row.answer,
      hybrid_quantifier_case: hybridIds.has(row.id),
      p0: { context: row.context, question: row.question },
      p1: {
        representation: formulas.map(item => `statement(${item.index}, ${item.prolog_term}).`).join("\n"),
        question: row.question,
        query_term: `query(${queryTerm}).`
      },
      source_formula_count: formulas.length
    };
  });
  return {
    schema_version: FIXTURE_SCHEMA,
    generator_version: "1",
    seed,
    source: { dataset: sourceManifest.dataset, split: sourceManifest.split, source_commit: sourceManifest.source_commit, sha256: sourceHash },
    cases
  };
}

function validateFixture(fixture) {
  if (!fixture || fixture.schema_version !== FIXTURE_SCHEMA || !Array.isArray(fixture.cases) || fixture.cases.length !== 12) throw new Error("fixture must contain exactly 12 cases");
  for (const answer of ["A", "B", "C"]) if (fixture.cases.filter(item => item.source_answer === answer).length !== 4) throw new Error(`fixture must have four ${answer} cases`);
  if (fixture.cases.filter(item => item.hybrid_quantifier_case).length !== 6) throw new Error("fixture must have six P2-hybrid quantified cases");
  for (const item of fixture.cases) {
    if (item.p0.question !== item.p1.question) throw new Error(`${item.case_id}: P0/P1 question mismatch`);
    if (!/^query\(.+\)\.$/s.test(item.p1.query_term) || !item.p1.representation.includes("statement(")) throw new Error(`${item.case_id}: malformed Prolog-term carrier`);
  }
  return true;
}

function parseArgs(argv) {
  const result = { seed: DEFAULT_SEED };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (["--source", "--source-manifest", "--output", "--seed"].includes(token) && argv[index + 1]) result[token.slice(2).replace(/-([a-z])/g, (_, char) => char.toUpperCase())] = argv[++index];
    else throw new Error("usage: proverqa-hard-preflight.js --source HARD.json --source-manifest source-manifest.json --output fixture.json [--seed TEXT]");
  }
  for (const name of ["source", "sourceManifest", "output"]) if (!result[name]) throw new Error(`--${name.replace(/[A-Z]/g, char => `-${char.toLowerCase()}`)} is required`);
  return result;
}

module.exports = { DEFAULT_SEED, FIXTURE_SCHEMA, SOURCE_SCHEMA, buildFixture, parseFol, selectRows, validateFixture };

if (require.main === module) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const sourceBytes = fs.readFileSync(options.source, "utf8");
    const sourceManifest = JSON.parse(fs.readFileSync(options.sourceManifest, "utf8"));
    const fixture = buildFixture({ sourceBytes, sourceManifest, seed: options.seed });
    validateFixture(fixture);
    fs.mkdirSync(path.dirname(options.output), { recursive: true });
    fs.writeFileSync(options.output, stable(fixture), { encoding: "utf8", flag: "wx" });
    console.log(JSON.stringify({ status: "ok", cases: fixture.cases.length, hybrid_cases: fixture.cases.filter(item => item.hybrid_quantifier_case).length, source_sha256: fixture.source.sha256 }));
  } catch (error) { console.error(`proverqa-hard-preflight: ${error.stack || error.message}`); process.exitCode = 1; }
}
