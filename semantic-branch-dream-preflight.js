"use strict";
// Selects visible-only, previously unused ProverQA records before any model
// call. Gold, source FOL, and reasoning never enter the output fixture.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const stable = value => JSON.stringify(value, null, 2) + "\n";
const rank = (seed, row) => sha256(`${seed}:${row.id}`);
function sentences(context) {
  const protectedText = context.replace(/\b(Dr|Mr|Mrs|Ms|Prof|St)\./g, "$1<dot>");
  return protectedText.split(/(?<=\.)\s+/).filter(Boolean).map((text, index) => ({ id: `s${index + 1}`, text: text.replace(/<dot>/g, ".") }));
}
function classOf(row) {
  const text = row.context.toLowerCase();
  if (text.includes("not necessarily both")) return "soft_disjunction";
  if (text.includes("either") && !text.includes("but not both")) return "no_explicit_exclusivity";
  return "explicit_exclusive_control";
}
function priorIds(root) {
  const ids = new Set();
  function visit(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === ".git" || entry.name === "node_modules") continue;
      const item = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(item);
      else if (/\.(json|md)$/i.test(entry.name)) {
        const text = fs.readFileSync(item, "utf8");
        for (const match of text.matchAll(/proverqa-hard-(\d+)/g)) ids.add(Number(match[1]));
        if (entry.name === "manifest.json" && item.includes("luna-thirty-paired-v1")) {
          try { for (const id of JSON.parse(text).selected_source_ids || []) ids.add(Number(id)); } catch { /* malformed historic file is not a fixture input */ }
        }
      }
    }
  }
  visit(root); return ids;
}
function select(rows, excluded, seed) {
  const picked = [];
  // The source has only two rows without any explicit exclusivity wording.
  // Preserve both, then sample plausible ambiguity cues and explicit controls.
  for (const [kind, amount] of [["soft_disjunction", 7], ["no_explicit_exclusivity", 2], ["explicit_exclusive_control", 3]]) {
    const choices = rows.filter(row => !excluded.has(row.id) && classOf(row) === kind).sort((a, b) => rank(seed, a).localeCompare(rank(seed, b)) || a.id - b.id);
    if (choices.length < amount) throw new Error(`insufficient unseen ${kind} cases`);
    picked.push(...choices.slice(0, amount));
  }
  return picked.sort((a, b) => a.id - b.id);
}
function build({ sourceBytes, excluded, seed }) {
  const rows = JSON.parse(sourceBytes);
  if (!Array.isArray(rows) || rows.length !== 500) throw new Error("expected the 500-row ProverQA hard split");
  const selected = select(rows, excluded, seed);
  return {
    schema_version: "semantic-branch-dream-visible-sample-v1",
    status: "frozen-before-model-output",
    selection: { seed, excluded_source_ids: [...excluded].sort((a, b) => a - b), method: "seven soft-disjunction, both no-explicit-exclusivity, and three explicit-control rows by lowest SHA-256 rank; source IDs sorted" },
    source: { dataset: "opendatalab/ProverQA", split: "dev/hard", sha256: sha256(sourceBytes) },
    cases: selected.map(row => ({ case_id: `proverqa-hard-${row.id}`, source_id: row.id, class: classOf(row), world: sentences(row.context), question: row.question }))
  };
}
function parseArgs(args) { const out = {}; for (let i = 0; i < args.length; i += 1) { const key = args[i]; if (["--source", "--root", "--output", "--seed"].includes(key) && args[i + 1]) out[key.slice(2)] = args[++i]; else throw new Error("usage: --source hard.json --root project-root --output sample.json --seed text"); } for (const key of ["source", "root", "output", "seed"]) if (!out[key]) throw new Error(`missing --${key}`); return out; }
module.exports = { build, classOf, priorIds, select, sentences };
if (require.main === module) try { const args = parseArgs(process.argv.slice(2)), sourceBytes = fs.readFileSync(args.source, "utf8"), fixture = build({ sourceBytes, excluded: priorIds(args.root), seed: args.seed }); fs.writeFileSync(args.output, stable(fixture), { flag: "wx" }); console.log(JSON.stringify({ status: fixture.status, cases: fixture.cases.length, sha256: sha256(stable(fixture)), excluded: fixture.selection.excluded_source_ids.length })); } catch (error) { console.error(`semantic-branch-dream-preflight: ${error.stack || error.message}`); process.exitCode = 1; }
