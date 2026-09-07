"use strict";
// Collection seam for a deliberately non-scoring, free-Prolog diagnostic.
// A transport supplies ordinary Prolog source; the collector only preserves it
// and hands it to the existing isolated thought runtime.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { runFreePrologDiagnostic } = require("./free-prolog-diagnostic");

const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const stable = value => JSON.stringify(value, null, 2) + "\n";
function promptFor(item, promptVersion = "v1") {
  const common = `Read this logical world and question. Write ordinary SWI-Prolog source that you believe helps test one relevant hypothesis, plus one bare callable Prolog query to execute. The query is an API argument, not a console command: never include ?- or a trailing period. You may use normal facts, rules, helper predicates, and built-ins; do not call the shell, read files, use network, or add directives. This is an exploratory diagnostic, not a request for a final A/B/C answer.`;
  const r2 = ` Before returning, self-check that every predicate called in a rule body is defined or intentionally supplied by SWI-Prolog. For “either/or, but not both”, encode both directions or an explicit exclusivity relation; do not silently reduce it to one implication. Negation-as-failure is allowed only when you intend its closed-world meaning.`;
  const r3 = ` A trusted finite-model semantics helper is preloaded and optional: finite_status(Domains, Axioms, Goal, MaxCandidateModels, Status, Certificate). Domains are e.g. [domain(person,[ada,ben])]. Its formula terms are atom(Name,Args), neg(F), and(F,G), or(F,G), xor(F,G), implies(F,G), forall(var(Name,Type),F), exists(var(Name,Type),F); variables in formula arguments use var(Name), constants may be atoms. It returns entailed, contradicted, unknown, conflict, or budget_exhausted. Use this helper when its classical finite semantics fits the question; otherwise write ordinary Prolog. Do not fake classical negation with \\+ unless you truly mean closed-world failure.`;
  const r4 = ` A trusted semantic Prolog API is preloaded and optional. Prefer this ordinary-Prolog surface when you need finite classical negation, XOR, or universal rules:\n\ndomain(person, [ada]).\naxiom(fact(calm(ada))).\naxiom(rule([calm(X)], ready(X))).\nsemantic_status(ready(ada), Status, Certificate).\n\nWrite domain/2 and axiom/1 declarations in your program; then query semantic_status(Goal, Status, Certificate). A fact may use ordinary predicate syntax, not(F), and(F,G), or(F,G), xor(F,G), or implies(F,G). A rule is rule([BodyLiteral,...], HeadFormula); its variables are universally quantified over person. The call returns entailed, contradicted, unknown, conflict, budget_exhausted, or invalid_program with a validation reason. Do not call finite_status/6 directly and do not use \\+ for classical negation.`;
  const r5 = `${r4} For a one-person-style goal in a large monadic world, prefer semantic_slice_status(Goal, Status, Certificate): the runtime, not you, computes and records a conservative relevant slice before execution. It returns slice_not_applicable rather than silently slicing relations or multi-argument predicates.`;
  const r6 = ` Write a complete auditable formalization: do not select a relevant fragment and do not answer the English question yourself. Give every source sentence an ID in an ordinary Prolog declaration, for example axiom(s1, fact(calm(ada))). or axiom(s2, rule([calm(X)], ready(X))). Preserve XOR, disjunction, and explicit negation visibly as xor(...), or(...), and not(...). Then return the bare query audit_trace(Goal, Result), where Goal is the question's ground predicate. The trace runtime will show a human-readable fact/rule path or no_forward_trace; it deliberately will not fake Horn proof steps for XOR, disjunction, or negation.`;
  const r7 = ` Write a complete auditable formalization: do not select a relevant fragment and do not answer the English question yourself. First declare every named person exactly once, for example domain(person, [ada, ben]). Then give every source sentence an ID in an ordinary Prolog declaration, for example axiom(s1, fact(calm(ada))). or axiom(s2, rule([calm(X)], and(ready(X), patient(X)))). Preserve XOR, disjunction, and explicit negation visibly as xor(...), or(...), and not(...). Finally return the bare query labelled_semantic_status(Goal, Status, Certificate), where Goal is the question's ground predicate. This trusted runtime checks both Goal and not(Goal) symbolically and returns entailed, contradicted, unknown, or conflict with the source IDs it used. Do not use ?-, a trailing period, shell, files, network, directives, finite_status/6, or your own final answer.`;
  if (!new Set(["v1", "v2-self-check", "v3-optional-semantics", "v4-surface-semantics", "v5-relevant-slice", "v6-complete-trace", "v7-labelled-countermodel"]).has(promptVersion)) throw new Error("unsupported free-Prolog diagnostic prompt version");
  const addon = promptVersion === "v2-self-check" ? r2 : promptVersion === "v3-optional-semantics" ? r3 : promptVersion === "v4-surface-semantics" ? r4 : promptVersion === "v5-relevant-slice" ? r5 : promptVersion === "v6-complete-trace" ? r6 : promptVersion === "v7-labelled-countermodel" ? r7 : "";
  return `${common}${addon} Return JSON only: {"program":"...","query":"..."}.\n\nWorld:\n${item.context}\n\nQuestion:\n${item.question}\n`;
}
function validateFixture(fixture) {
  if (!fixture || fixture.schema_version !== "free-prolog-diagnostic-fixture-v1" || !Array.isArray(fixture.cases) || fixture.cases.length < 1) throw new Error("expected non-empty free-Prolog diagnostic fixture");
  const ids = new Set();
  for (const item of fixture.cases) {
    if (!item || typeof item.case_id !== "string" || !item.case_id || ids.has(item.case_id) || typeof item.context !== "string" || !item.context || typeof item.question !== "string" || !item.question) throw new Error("malformed diagnostic case");
    ids.add(item.case_id);
  }
}
function freshRoot(rawRoot) { if (typeof rawRoot !== "string" || !path.isAbsolute(rawRoot) || fs.existsSync(rawRoot) || !fs.existsSync(path.dirname(rawRoot))) throw new Error("rawRoot must be a fresh absolute path with an existing parent"); fs.mkdirSync(rawRoot, { mode: 0o700 }); }
async function collect({ fixture, rawRoot, generate, promptVersion = "v1", timeoutMs = 1500, maxOutputBytes = 256 * 1024 }) {
  validateFixture(fixture); freshRoot(rawRoot); if (typeof generate !== "function") throw new Error("generate must be a function");
  const fixtureText = stable(fixture), fixtureSha = sha256(fixtureText), records = [];
  for (const item of fixture.cases) {
    const prompt = promptFor(item, promptVersion); let generated, observation = null, transportError = null;
    try {
      generated = await generate({ caseId: item.case_id, prompt });
      if (!generated || typeof generated.program !== "string" || typeof generated.query !== "string") throw new Error("generator must return program and query strings");
      observation = await runFreePrologDiagnostic({ caseId: item.case_id, program: generated.program, query: generated.query, source: "diagnostic-agent", timeoutMs, maxOutputBytes });
    } catch (error) { transportError = String(error && (error.stack || error.message) || error); }
    const record = Object.freeze({ case_id: item.case_id, fixture_sha256: fixtureSha, prompt_sha256: sha256(prompt), generated: generated ? { program: generated.program, query: generated.query } : null, observation, transport_error: transportError });
    fs.writeFileSync(path.join(rawRoot, `${item.case_id}.json`), stable(record), { encoding: "utf8", flag: "wx", mode: 0o600 }); records.push(record);
  }
  const result = Object.freeze({ schema_version: "free-prolog-diagnostic-run-v1", status: "observed-not-scored", prompt_version: promptVersion, fixture_sha256: fixtureSha, records: Object.freeze(records) });
  fs.writeFileSync(path.join(rawRoot, "aggregate-not-a-score.json"), stable(result), { encoding: "utf8", flag: "wx", mode: 0o600 }); return result;
}
module.exports = { collect, promptFor, validateFixture };
