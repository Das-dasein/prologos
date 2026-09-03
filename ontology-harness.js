"use strict";

// Bounded ontology proposal validator and SWI adapter.  This module deliberately
// does not expose a Prolog goal string; the runner receives only a registry key.
const { execFile } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const ATOM = /^[a-z][a-z0-9_]*$/;
const VARIABLE = /^[A-Z][A-Za-z0-9_]*$/;
const CANDIDATE = /^cand-[a-z0-9][a-z0-9._-]{0,63}$/;
const RULE_ID = /^r_[a-z0-9][a-z0-9_]{0,47}$/;
// The ontology registry is the contract boundary.  It is deliberately kept
// here, rather than inferred from the employment claim store: those names are
// merely one set of fixtures accepted by this domain-neutral registry.
const BASE_PREDICATES = [
  "likes", "dislikes", "lives_in", "works_at", "studies_at", "role",
  "birth_year", "email", "prefers", "owns", "uses", "interested_in",
  "previous_project", "knows_technology", "worked_with_technology"
].concat(["role_at_semester", "role_before_semester", "project_role_at"]);
const PREDICATE_REGISTRY = Object.fromEntries([
  ...BASE_PREDICATES.map(p => [p, { kind: "base", arity: p.endsWith("_semester") || p === "project_role_at" ? 4 : 2 }]),
  ["current_project_at", { kind: "base", arity: 3 }],
  ["worked_on", { kind: "derived", arity: 2 }],
  ["has_frontend_experience", { kind: "derived", arity: 1 }],
  ["current_project", { kind: "derived", arity: 3 }],
  ["knows_frontend_framework", { kind: "derived", arity: 1 }],
  ["knows_multiple_programming_languages", { kind: "derived", arity: 1 }]
]);
const RELATIONS = new Set(Object.entries(PREDICATE_REGISTRY).filter(([, x]) => x.kind === "base").map(([p]) => p));
const ARITIES = Object.fromEntries(Object.entries(PREDICATE_REGISTRY).filter(([, x]) => x.kind === "base").map(([p, x]) => [p, x.arity]));
const DERIVED = new Set(Object.entries(PREDICATE_REGISTRY).filter(([, x]) => x.kind === "derived").map(([p]) => p));
const DERIVED_ARITIES = Object.fromEntries(Object.entries(PREDICATE_REGISTRY).filter(([, x]) => x.kind === "derived").map(([p, x]) => [p, x.arity]));
const ALL_ARITIES = Object.fromEntries(Object.entries(PREDICATE_REGISTRY).map(([p, x]) => [p, x.arity]));
const IMMUTABLE_CORE = new Set(["claim", "active_claim", "conflict", "supersedes", "ontology_support"]);

function failure(code, message) { const e = new Error(message); e.code = code; throw e; }
function own(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
function exact(o, keys, label) {
  if (!o || typeof o !== "object" || Array.isArray(o)) failure("SCHEMA", `${label} must be an object`);
  const got = Object.keys(o).sort(), want = [...keys].sort();
  if (got.length !== want.length || got.some((k, i) => k !== want[i])) failure("UNKNOWN_KEY", `${label} has unknown or missing keys`);
}
function validateArg(a, where) {
  if (typeof a !== "string" || (!ATOM.test(a) && !VARIABLE.test(a)) || a === "_")
    failure("BAD_ARGUMENT", `${where} is not an atom or variable`);
}
function validateTerm(t, where) {
  exact(t, ["predicate", "arguments"], where);
  if (typeof t.predicate !== "string" || !ATOM.test(t.predicate)) failure("BAD_PREDICATE", `${where}.predicate`);
  if (!Array.isArray(t.arguments) || t.arguments.length < 1 || t.arguments.length > 4)
    failure("BAD_ARITY", `${where}.arguments`);
  t.arguments.forEach((a, i) => validateArg(a, `${where}.arguments[${i}]`));
  if (!(t.predicate in ALL_ARITIES) || ALL_ARITIES[t.predicate] !== t.arguments.length)
    failure("PREDICATE_ARITY", `${t.predicate}/${t.arguments.length} is not registered`);
}
function validateProposal(proposal) {
  let p = proposal;
  if (typeof p === "string") { try { p = JSON.parse(p); } catch (_) { failure("JSON_PARSE", "proposal is not valid JSON"); } }
  exact(p, ["schema_version", "candidate_version", "facts", "rules"], "proposal");
  if (p.schema_version !== "ontology-proposal-v0") failure("SCHEMA_VERSION", "unsupported schema_version");
  if (typeof p.candidate_version !== "string" || !CANDIDATE.test(p.candidate_version)) failure("CANDIDATE_VERSION", "bad candidate_version");
  if (!Array.isArray(p.facts) || p.facts.length > 100 || !Array.isArray(p.rules) || p.rules.length > 50) failure("COLLECTION_LIMIT", "facts/rules exceed limits");
  p.facts.forEach((f, i) => { validateTerm(f, `facts[${i}]`); if (!PREDICATE_REGISTRY[f.predicate] || PREDICATE_REGISTRY[f.predicate].kind !== "base") failure("FACT_PREDICATE", `facts[${i}] predicate is not a registered base predicate`); if (f.arguments.some(a => VARIABLE.test(a))) failure("FACT_VARIABLE", `facts[${i}] contains variable`); });
  const ids = new Set();
  p.rules.forEach((r, i) => {
    exact(r, ["id", "head", "body"], `rules[${i}]`);
    if (typeof r.id !== "string" || !RULE_ID.test(r.id)) failure("RULE_ID", `rules[${i}].id`);
    if (ids.has(r.id)) failure("DUPLICATE_RULE_ID", r.id); ids.add(r.id);
    validateTerm(r.head, `rules[${i}].head`);
    if (IMMUTABLE_CORE.has(r.head.predicate) || !DERIVED.has(r.head.predicate))
      failure("IMMUTABLE_PREDICATE", `${r.id}: rule head must be a registered derived predicate`);
    if (!Array.isArray(r.body) || r.body.length < 1 || r.body.length > 4) failure("BODY_LIMIT", `${r.id} body`);
    const vars = new Set(), bound = new Set();
    r.body.forEach((g, j) => { validateTerm(g, `${r.id}.body[${j}]`); g.arguments.forEach(a => { if (VARIABLE.test(a)) { vars.add(a); if (j > 0 && !bound.has(a)) failure("UNBOUND_VARIABLE", `${r.id}: ${a}`); } }); g.arguments.forEach(a => { if (VARIABLE.test(a)) bound.add(a); }); });
    r.head.arguments.forEach(a => { if (VARIABLE.test(a) && !bound.has(a)) failure("HEAD_VARIABLE", `${r.id}: ${a}`); });
    if (vars.size > 6) failure("VARIABLE_LIMIT", r.id);
  });
  // Acyclic dependencies are the v0 stratification boundary.
  const edges = new Map(); p.rules.forEach(r => { if (!edges.has(r.head.predicate)) edges.set(r.head.predicate, new Set()); r.body.forEach(g => { if (DERIVED.has(g.predicate)) edges.get(r.head.predicate).add(g.predicate); }); });
  function visit(n, stack = new Set(), done = new Set()) { if (stack.has(n)) failure("RULE_CYCLE", `cycle at ${n}`); if (done.has(n)) return; stack.add(n); for (const x of edges.get(n) || []) visit(x, stack, done); stack.delete(n); done.add(n); }
  for (const n of edges.keys()) visit(n);
  return p;
}
function atom(a) { return a; }
function term(t) { return `${atom(t.predicate)}(${t.arguments.join(",")})`; }
function compile(p) {
  const source = [...p.facts.map(f => `${term(f)}.`),
    ...p.rules.flatMap(r => [`${term(r.head)} :- ${r.body.map(term).join(", ")}.`,
      `ontology_support(${r.id}) :- ${r.body.map(term).join(", ")}.`])].join("\n") + "\n";
  if (Buffer.byteLength(source) > 4096) failure("SOURCE_LIMIT", "compiled candidate exceeds 4096 bytes");
  return source;
}
function result(p, status, answers = [], error = null, rules = []) { return { schema_version: "ontology-result-v0", candidate_version: p.candidate_version, status, answers, supporting_rules: [...rules].sort(), supporting_claims: [], error }; }
function run(p, request = { query: "derived" }, options = {}) {
    try { p = validateProposal(p); compile(p); exact(request, ["query", "parameters"], "request"); if (!["active_claims", "conflicts", "derived", "provenance"].includes(request.query)) failure("QUERY_REGISTRY", "unknown query"); if (!Array.isArray(request.parameters)) failure("QUERY_PARAMETERS", "parameters must be an array"); if (request.parameters.length !== 0) failure("QUERY_PARAMETERS", "registered queries do not accept parameters"); }
  catch (e) { return result(p || { candidate_version: null }, "rejected", [], { code: e.code || "SCHEMA", message: e.message }); }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pam-ontology-")), file = path.join(dir, "candidate.pl");
  fs.writeFileSync(file, compile(p));
  const bin = process.env.SWIPL_BIN || "swipl", timeout = options.timeout || 5000;
  return new Promise(resolve => execFile(bin, ["-q", "-s", path.join(__dirname, "ontology-runner.pl"), "--", file, request.query, JSON.stringify(request.parameters)], { timeout, maxBuffer: 4 * 1024 * 1024 }, (err, stdout, stderr) => {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {}
    if (err) { const timed = err.killed || err.signal === "SIGTERM"; return resolve(result(p, timed ? "timeout" : "swipl_error", [], { code: timed ? "TIMEOUT" : "SWIPL_EXIT", message: (stderr || err.message).trim().split("\n")[0] })); }
    try { const x = JSON.parse(stdout); resolve(result(p, "ok", x.answers || [], null, x.supporting_rules || [])); } catch (_) { resolve(result(p, "swipl_error", [], { code: "INVALID_JSON", message: "SWI returned invalid JSON" })); }
  }));
}
module.exports = { validateProposal, compile, run, RELATIONS, ARITIES, DERIVED_ARITIES, PREDICATE_REGISTRY };

if (require.main === module) {
  const i = process.argv.indexOf("--proposal");
  if (i < 0 || !process.argv[i + 1]) { console.error("usage: node ontology-harness.js --proposal FILE [--query NAME]"); process.exitCode = 2; }
  else {
    let proposal; try { proposal = JSON.parse(fs.readFileSync(process.argv[i + 1], "utf8")); } catch (e) { proposal = "{"; }
    const qi = process.argv.indexOf("--query");
    const q = qi >= 0 ? (process.argv[qi + 1] || "") : "derived";
    run(proposal, { query: q, parameters: [] }).then(x => process.stdout.write(JSON.stringify(x) + "\n"));
  }
}
