"use strict";

// Builds a visible-only development fixture where every source XOR has an
// explicit matching cue in its English sentence.  nl2fol and answers are used
// here solely for selection and a separate scorer; neither is written into the
// model fixture.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const sha256 = text => crypto.createHash("sha256").update(text).digest("hex");
const stable = value => JSON.stringify(value, null, 2) + "\n";
const rank = (seed, row) => sha256(`${seed}:${row.id}`);

function sourceXorSentences(row) {
  if (!row || !row.nl2fol || typeof row.nl2fol !== "object") throw Error(`missing_nl2fol_${row && row.id}`);
  return Object.entries(row.nl2fol).filter(([, formula]) => String(formula).includes("⊕"));
}
function explicitXorCue(sentence) {
  const text = String(sentence).toLowerCase();
  return (text.includes("but not both") || text.includes("mutually exclusive")) && !text.includes("not necessarily both") && !text.includes("not mutually exclusive");
}
function compatible(row) { return sourceXorSentences(row).every(([sentence]) => explicitXorCue(sentence)); }
function select(rows, excluded, seed) {
  const eligible = rows.filter(row => !excluded.has(row.id) && compatible(row));
  const selected = ["A", "B", "C"].flatMap(answer => eligible.filter(row => row.answer === answer).sort((left, right) => rank(seed, left).localeCompare(rank(seed, right)) || left.id - right.id).slice(0, 10));
  if (selected.length !== 30 || new Set(selected.map(row => row.id)).size !== 30 || ["A", "B", "C"].some(answer => selected.filter(row => row.answer === answer).length !== 10)) throw Error("cannot_select_balanced_30");
  return selected.sort((left, right) => left.id - right.id);
}
function build({ sourceBytes, excluded, seed }) {
  const rows = JSON.parse(sourceBytes);
  if (!Array.isArray(rows) || rows.length !== 500) throw Error("expected_500_proverqa_hard_rows");
  const selected = select(rows, excluded, seed);
  return {
    fixture: {
      schema_version: "proverqa-explicit-xor-visible-v1",
      status: "frozen-before-model-output",
      source: { dataset: "opendatalab/ProverQA", split: "dev/hard", sha256: sha256(sourceBytes) },
      selection: { seed, count_per_answer: 10, contract: "every hidden XOR selected for this fixture has an explicit English cue: but not both or mutually exclusive; sentences saying not necessarily both or not mutually exclusive are excluded", excluded_source_ids: [...excluded].sort((a, b) => a - b) },
      cases: selected.map(row => ({ id: row.id, context: row.context, question: row.question }))
    },
    scorer: { status: "frozen-scorer-only", answers: Object.fromEntries(selected.map(row => [row.id, row.answer])) },
    selectionAudit: selected.map(row => ({ id: row.id, xor_sentence_count: sourceXorSentences(row).length, all_xor_sentences_explicit: compatible(row) }))
  };
}
function parseArgs(args) { const out = {}; for (let index = 0; index < args.length; index += 1) { const key = args[index]; if (["--source", "--output", "--scorer", "--audit", "--seed", "--exclude"].includes(key) && args[index + 1]) out[key.slice(2)] = args[++index]; else throw Error("usage: --source hard.json --output fixture.json --scorer scorer.json --audit audit.json --seed text --exclude ids.json"); } for (const key of ["source", "output", "scorer", "audit", "seed", "exclude"]) if (!out[key]) throw Error(`missing_${key}`); return out; }
if (require.main === module) try { const args = parseArgs(process.argv.slice(2)); const excluded = new Set(JSON.parse(fs.readFileSync(args.exclude, "utf8"))); const result = build({ sourceBytes: fs.readFileSync(args.source, "utf8"), excluded, seed: args.seed }); fs.writeFileSync(args.output, stable(result.fixture), { flag: "wx" }); fs.writeFileSync(args.scorer, stable(result.scorer), { flag: "wx" }); fs.writeFileSync(args.audit, stable({ source_sha256: result.fixture.source.sha256, selection_audit: result.selectionAudit }), { flag: "wx" }); process.stdout.write(JSON.stringify({ status: result.fixture.status, ids: result.fixture.cases.map(row => row.id), selection_audit: result.selectionAudit }) + "\n"); } catch (error) { process.stderr.write(`${error.stack || error}\n`); process.exitCode = 1; }
module.exports = { sourceXorSentences, explicitXorCue, compatible, select, build };
