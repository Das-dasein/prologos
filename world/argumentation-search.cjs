#!/usr/bin/env node
"use strict";
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { check, stable } = require("./checker");
const { opposite, buildArgumentGraph, analyzeDung } = require("./argumentation");

// This finite basis is deliberately small and named. It is a search boundary,
// not a claim about all signed-Horn programs.
const BASIS = Object.freeze([
  "p(orion).", "neg(p(orion)).", "q(orion).", "neg(q(orion)).",
  "r(orion).", "neg(r(orion)).", "r(X) :- p(X).", "r(X) :- q(X).",
  "neg(r(X)) :- p(X).", "neg(r(X)) :- q(X)."
]);
const IDEAS = Object.freeze({ version: "argumentation-search-v1", predicates: ["p", "q", "r"].map(name => ({ name, arity: 1 })) });
const QUERY = "r(orion)";
const sha = value => crypto.createHash("sha256").update(typeof value === "string" || Buffer.isBuffer(value) ? value : stable(value)).digest("hex");

function worldFor(mask) {
  return BASIS.flatMap((program, index) => (mask & (1 << index)) === 0 ? [] : [{ id: `basis_${index}`, source: `basis_${index}`, program }]);
}
function acceptanceStatus(graph, ids, query = QUERY) {
  const conclusions = new Map(graph.arguments.map(argument => [argument.id, argument.conclusion]));
  const positive = ids.some(id => conclusions.get(id) === query);
  const negative = ids.some(id => conclusions.get(id) === opposite(query));
  if (positive && negative) return "conflict";
  if (positive) return "entailed";
  if (negative) return "contradicted";
  return "unknown";
}
function summaryOf(mask, receipt, graph, dung) {
  const preferred_statuses = [...new Set(dung.preferred.map(extension => acceptanceStatus(graph, extension)))].sort();
  return {
    mask,
    programs: worldFor(mask).map(item => item.program),
    raw_status: receipt.raw_status,
    safe_status: receipt.safe_status,
    grounded_status: acceptanceStatus(graph, dung.grounded),
    preferred_statuses,
    arguments: graph.arguments.length,
    attacks: graph.attacks.length
  };
}
async function searchBasis() {
  const distributions = new Map(), safe_grounded_divergences = [], safe_preferred_divergences = [];
  const worlds = 2 ** BASIS.length;
  for (let mask = 0; mask < worlds; mask++) {
    const receipt = await check({ snapshot: { ideas: IDEAS, items: worldFor(mask) }, query: QUERY });
    if (receipt.status !== "ok") throw new Error(`basis mask ${mask}: checker ${receipt.status}/${receipt.reason ?? ""}`);
    const graph = buildArgumentGraph(receipt), dung = analyzeDung(graph), row = summaryOf(mask, receipt, graph, dung);
    const key = JSON.stringify([row.safe_status, row.grounded_status, row.preferred_statuses]);
    distributions.set(key, (distributions.get(key) || 0) + 1);
    if (row.safe_status !== row.grounded_status) safe_grounded_divergences.push(row);
    if (!row.preferred_statuses.every(status => status === row.safe_status)) safe_preferred_divergences.push(row);
  }
  const structuredMask = [0, 1, 2, 6, 7, 8].reduce((mask, index) => mask | (1 << index), 0);
  const structured = safe_preferred_divergences.find(row => row.mask === structuredMask);
  return {
    boundary: { query: QUERY, basis: BASIS, worlds, max_arguments: 16, no_llm_generation: true },
    summary: {
      safe_grounded_divergences: safe_grounded_divergences.length,
      safe_preferred_divergences: safe_preferred_divergences.length,
      status_distribution: Object.fromEntries([...distributions].sort(([a], [b]) => a.localeCompare(b)))
    },
    witnesses: {
      first_preferred_divergence: safe_preferred_divergences[0] ?? null,
      structured_premise_attack: structured ?? null,
      first_safe_grounded_divergence: safe_grounded_divergences[0] ?? null
    }
  };
}
function outPath(argv) {
  if (argv.length !== 2 || argv[0] !== "--out" || !argv[1]) throw new Error("Usage: argumentation-search.cjs --out NEW_RECEIPT.json");
  return path.resolve(argv[1]);
}
async function main() {
  const out = outPath(process.argv.slice(2));
  if (fs.existsSync(out)) throw new Error("refusing to overwrite a search receipt");
  const result = await searchBasis();
  const receipt = {
    version: "support-attack-bounded-search-v1",
    status: "completed",
    interpretation: "Finite counterexample search only. A zero count is not a theorem outside the declared ten-component basis.",
    source_sha256: { search: sha(fs.readFileSync(__filename)), argumentation: sha(fs.readFileSync(path.join(__dirname, "argumentation.js"))), checker: sha(fs.readFileSync(path.join(__dirname, "checker.pl"))) },
    ...result
  };
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(receipt, null, 2) + "\n");
  process.stdout.write(JSON.stringify({ out, status: receipt.status, ...receipt.summary }) + "\n");
}
if (require.main === module) main().catch(error => { process.stderr.write(error.stack + "\n"); process.exitCode = 1; });
module.exports = { BASIS, IDEAS, QUERY, worldFor, acceptanceStatus, searchBasis };
