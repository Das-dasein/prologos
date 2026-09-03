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
// These names are owned by the trusted runner or by SWI-Prolog.  The check is
// intentionally independent of the selected registry: a caller must not be
// able to turn a system predicate into an ontology predicate by declaring it.
const RESERVED_PREDICATES = new Set([
  ...IMMUTABLE_CORE,
  "ontology_derived", "main", "dispatch", "supporting_for",
  "consult", "include", "use_module", "ensure_loaded", "load_files",
  "module", "initialization", "assert", "asserta", "assertz", "retract",
  "abolish", "clause", "recorda", "recordz", "erase", "call", "once",
  "not", "catch", "throw", "setup_call_cleanup", "call_cleanup",
  "current_predicate", "predicate_property", "current_prolog_flag",
  "findall", "bagof", "setof", "sort", "keysort", "aggregate",
  "atom_json_term", "json_write_dict", "open", "close", "read",
  "write", "writeln", "format", "shell", "process_create", "halt",
  "true", "fail", "!", "is"
]);

function assertRegistrySafe(registry) {
  if (!registry || typeof registry !== "object" || Array.isArray(registry))
    failure("REGISTRY", "registry must be an object");
  for (const name of Object.keys(registry)) {
    if (RESERVED_PREDICATES.has(name))
      failure("IMMUTABLE_PREDICATE", `reserved predicate ${name}`);
  }
}

// Callers may provide a versioned registry explicitly.  The bundled registry
// is retained solely as the employment-shaped v0 fixture.
function createPredicateRegistry(declarations) {
  if (!Array.isArray(declarations) || declarations.length === 0) failure("REGISTRY", "registry must contain declarations");
  const out = {};
  for (const d of declarations) {
    exact(d, ["name", "arity", "kind"], "registry declaration");
    if (typeof d.name !== "string" || !ATOM.test(d.name) || !Number.isInteger(d.arity) || d.arity < 1 || d.arity > 4 || !["base", "derived"].includes(d.kind)) failure("REGISTRY", "invalid registry declaration");
    if (out[d.name]) failure("REGISTRY", `duplicate registry predicate ${d.name}`);
    if (RESERVED_PREDICATES.has(d.name)) failure("IMMUTABLE_PREDICATE", `reserved predicate ${d.name}`);
    out[d.name] = { arity: d.arity, kind: d.kind };
  }
  return out;
}

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
function validateTerm(t, where, registry = PREDICATE_REGISTRY) {
  exact(t, ["predicate", "arguments"], where);
  if (typeof t.predicate !== "string" || !ATOM.test(t.predicate)) failure("BAD_PREDICATE", `${where}.predicate`);
  if (RESERVED_PREDICATES.has(t.predicate)) failure("IMMUTABLE_PREDICATE", `${where}: reserved predicate ${t.predicate}`);
  if (!Array.isArray(t.arguments) || t.arguments.length < 1 || t.arguments.length > 4)
    failure("BAD_ARITY", `${where}.arguments`);
  t.arguments.forEach((a, i) => validateArg(a, `${where}.arguments[${i}]`));
  if (!(t.predicate in registry) || registry[t.predicate].arity !== t.arguments.length)
    failure("PREDICATE_ARITY", `${t.predicate}/${t.arguments.length} is not registered`);
}
function validateProposal(proposal, registry = PREDICATE_REGISTRY) {
  let p = proposal;
  if (typeof p === "string") { try { p = JSON.parse(p); } catch (_) { failure("JSON_PARSE", "proposal is not valid JSON"); } }
  exact(p, own(p, "registry") ? ["schema_version", "candidate_version", "facts", "rules", "registry"] : ["schema_version", "candidate_version", "facts", "rules"], "proposal");
  if (own(p, "registry") && registry === PREDICATE_REGISTRY) registry = createPredicateRegistry(p.registry);
  assertRegistrySafe(registry);
  if (p.schema_version !== "ontology-proposal-v0") failure("SCHEMA_VERSION", "unsupported schema_version");
  if (typeof p.candidate_version !== "string" || !CANDIDATE.test(p.candidate_version)) failure("CANDIDATE_VERSION", "bad candidate_version");
  if (!Array.isArray(p.facts) || p.facts.length > 100 || !Array.isArray(p.rules) || p.rules.length > 50) failure("COLLECTION_LIMIT", "facts/rules exceed limits");
  const entries = Object.entries(registry), derived = new Set(entries.filter(([, x]) => x.kind === "derived").map(([n]) => n));
  p.facts.forEach((f, i) => { validateTerm(f, `facts[${i}]`, registry); if (!registry[f.predicate] || registry[f.predicate].kind !== "base") failure("FACT_PREDICATE", `facts[${i}] predicate is not a registered base predicate`); if (f.arguments.some(a => VARIABLE.test(a))) failure("FACT_VARIABLE", `facts[${i}] contains variable`); });
  const ids = new Set();
  p.rules.forEach((r, i) => {
    exact(r, ["id", "head", "body"], `rules[${i}]`);
    if (typeof r.id !== "string" || !RULE_ID.test(r.id)) failure("RULE_ID", `rules[${i}].id`);
    if (ids.has(r.id)) failure("DUPLICATE_RULE_ID", r.id); ids.add(r.id);
    validateTerm(r.head, `rules[${i}].head`, registry);
    if (RESERVED_PREDICATES.has(r.head.predicate) || !derived.has(r.head.predicate))
      failure("IMMUTABLE_PREDICATE", `${r.id}: rule head must be a registered derived predicate`);
    if (!Array.isArray(r.body) || r.body.length < 1 || r.body.length > 4) failure("BODY_LIMIT", `${r.id} body`);
    const vars = new Set(), bound = new Set();
    r.body.forEach((g, j) => { validateTerm(g, `${r.id}.body[${j}]`, registry); g.arguments.forEach(a => { if (VARIABLE.test(a)) { vars.add(a); if (j > 0 && !bound.has(a)) failure("UNBOUND_VARIABLE", `${r.id}: ${a}`); } }); g.arguments.forEach(a => { if (VARIABLE.test(a)) bound.add(a); }); });
    r.head.arguments.forEach(a => { if (VARIABLE.test(a) && !bound.has(a)) failure("HEAD_VARIABLE", `${r.id}: ${a}`); });
    if (vars.size > 6) failure("VARIABLE_LIMIT", r.id);
  });
  // Acyclic dependencies are the v0 stratification boundary.
  const edges = new Map(); p.rules.forEach(r => { if (!edges.has(r.head.predicate)) edges.set(r.head.predicate, new Set()); r.body.forEach(g => { if (derived.has(g.predicate)) edges.get(r.head.predicate).add(g.predicate); }); });
  function visit(n, stack = new Set(), done = new Set()) { if (stack.has(n)) failure("RULE_CYCLE", `cycle at ${n}`); if (done.has(n)) return; stack.add(n); for (const x of edges.get(n) || []) visit(x, stack, done); stack.delete(n); done.add(n); }
  for (const n of edges.keys()) visit(n);
  return p;
}
function atom(a) { return a; }
function term(t) { return `${atom(t.predicate)}(${t.arguments.join(",")})`; }
function compile(p) {
  const source = [...p.facts.map(f => `${term(f)}.`),
    ...p.rules.flatMap(r => [`${term(r.head)} :- ${r.body.map(term).join(", ")}.`,
      `ontology_derived(${r.head.predicate}, [${r.head.arguments.join(",")}]) :- ${term(r.head)}.`,
      `ontology_support(${r.id}, ${r.head.predicate}, [${r.head.arguments.join(",")}]) :- ${term(r.head)}, ${r.body.map(term).join(", ")}.`])].join("\n") + "\n";
  if (Buffer.byteLength(source) > 4096) failure("SOURCE_LIMIT", "compiled candidate exceeds 4096 bytes");
  return source;
}
function result(p, status, answers = [], error = null, rules = []) { return { schema_version: "ontology-result-v0", candidate_version: p.candidate_version, status, answers, supporting_rules: [...rules].sort(), supporting_claims: [], error }; }
function candidateVersion(input) { if (input && typeof input === "object" && typeof input.candidate_version === "string") return input.candidate_version; if (typeof input === "string") { try { const x = JSON.parse(input); return typeof x.candidate_version === "string" ? x.candidate_version : null; } catch (_) {} } return null; }
function stableError(err) { const code = err && err.code; return { code: code === "ETIMEDOUT" ? "TIMEOUT" : (code === "ENOENT" ? "SWIPL_NOT_FOUND" : "SWIPL_EXIT"), message: code === "ENOENT" ? "SWI-Prolog executable unavailable" : code === "ETIMEDOUT" ? "SWI-Prolog execution timed out" : "SWI-Prolog exited unsuccessfully" }; }
function run(p, request = { query: "derived" }, options = {}) {
    const version = candidateVersion(p);
    try { const selectedRegistry = options.registry || ((p && typeof p === "object" && own(p, "registry")) ? createPredicateRegistry(p.registry) : PREDICATE_REGISTRY); p = validateProposal(p, selectedRegistry); compile(p); exact(request, ["query", "parameters"], "request"); if (!["active_claims", "conflicts", "derived", "provenance"].includes(request.query)) failure("QUERY_REGISTRY", "unknown query"); if (!Array.isArray(request.parameters)) failure("QUERY_PARAMETERS", "parameters must be an array"); if (request.parameters.length !== 0) failure("QUERY_PARAMETERS", "registered queries do not accept parameters"); }
  catch (e) { return result({ candidate_version: version }, "rejected", [], { code: e.code || "SCHEMA", message: e.message }); }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pam-ontology-")), file = path.join(dir, "candidate.pl");
  fs.writeFileSync(file, compile(p));
  const bin = process.env.SWIPL_BIN || "swipl", timeout = options.timeout || 5000;
  return new Promise(resolve => execFile(bin, ["-q", "-s", path.join(__dirname, "ontology-runner.pl"), "--", file, request.query, JSON.stringify(request.parameters)], { timeout, maxBuffer: 4 * 1024 * 1024 }, (err, stdout, stderr) => {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {}
    if (err) { const normalized = stableError(err); return resolve(result(p, normalized.code === "TIMEOUT" ? "timeout" : "swipl_error", [], normalized)); }
    try { const x = JSON.parse(stdout); resolve(result(p, "ok", x.answers || [], null, x.supporting_rules || [])); } catch (_) { resolve(result(p, "swipl_error", [], { code: "INVALID_JSON", message: "SWI returned invalid JSON" })); }
  }));
}
module.exports = { validateProposal, compile, run, RELATIONS, ARITIES, DERIVED_ARITIES, PREDICATE_REGISTRY, createPredicateRegistry, RESERVED_PREDICATES };

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
