"use strict";
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { run, validateProposal, createPredicateRegistry } = require("./ontology-harness");

const base = { schema_version: "ontology-proposal-v0", candidate_version: "cand-20260903-001", facts: [
  { predicate: "knows_technology", arguments: ["user", "java"] },
  { predicate: "knows_technology", arguments: ["user", "python"] }
], rules: [{ id: "r_knows_two", head: { predicate: "knows_multiple_programming_languages", arguments: ["P"] }, body: [
  { predicate: "knows_technology", arguments: ["P", "java"] },
  { predicate: "knows_technology", arguments: ["P", "python"] }
] }] };

(async () => {
  assert.doesNotThrow(() => validateProposal(base));
  const accepted = await run(base, { query: "derived", parameters: [] });
  assert.equal(accepted.status, "ok");
  assert.deepEqual(accepted.answers[0].bindings, { P: "user" });
  assert.deepEqual(accepted.supporting_rules, ["r_knows_two"]);
  // A successful but unrelated rule is not evidence for this answer.
  const withIrrelevant = JSON.parse(JSON.stringify(base));
  withIrrelevant.rules.push({ id: "r_irrelevant", head: { predicate: "knows_frontend_framework", arguments: ["P"] }, body: [
    { predicate: "knows_technology", arguments: ["P", "java"] }
  ] });
  const filtered = await run(withIrrelevant, { query: "derived", parameters: [] });
  assert.equal(filtered.status, "ok");
  assert.deepEqual(filtered.supporting_rules, ["r_knows_two"]);
  assert.equal((await run(base, { query: "derived", parameters: ["user"] })).error.code, "QUERY_PARAMETERS");
  const claims = await run(base, { query: "active_claims", parameters: [] });
  assert.deepEqual(claims.supporting_rules, []);
  const baseHead = JSON.parse(JSON.stringify(base));
  baseHead.rules[0].head = { predicate: "knows_technology", arguments: ["P", "java"] };
  assert.equal((await run(baseHead, { query: "derived", parameters: [] })).error.code, "IMMUTABLE_PREDICATE");
  for (const [name, mutate] of [
    ["unknown key", p => { p.extra = 1; }],
    ["bad predicate", p => { p.facts[0].predicate = "consult"; }],
    ["wrong arity", p => { p.facts[0].arguments = ["user"]; }],
    ["bad atom", p => { p.facts[0].arguments[1] = "Bad"; }],
    ["head-only variable", p => { p.rules[0].head.arguments = ["Q"]; }],
    ["duplicate id", p => { p.rules.push({ ...p.rules[0] }); }],
    ["unknown query", p => { p.query = "active_claim(_,_,_)"; }]
  ]) {
    const p = JSON.parse(JSON.stringify(base));
    if (name === "unknown query") { const got = await run(p, { query: p.query, parameters: [] }); assert.equal(got.status, "rejected"); }
    else { mutate(p); assert.equal((await run(p, { query: "derived", parameters: [] })).status, "rejected", name); }
  }
  const malformed = await run("{", { query: "derived", parameters: [] });
  assert.equal(malformed.status, "rejected");
  assert.equal(malformed.candidate_version, null);
  const malformedWithVersion = await run({ candidate_version: "cand-preserved" }, { query: "derived", parameters: [] });
  assert.equal(malformedWithVersion.candidate_version, "cand-preserved");
  const old = process.env.SWIPL_BIN;
  process.env.SWIPL_BIN = path.join(__dirname, "test-fixtures", "does-not-exist-swipl");
  const failed = await run(base, { query: "derived", parameters: [] });
  assert.equal(failed.status, "swipl_error"); assert.deepEqual(failed.answers, []);
  assert.equal(failed.error.code, "SWIPL_NOT_FOUND");
  assert(!failed.error.message.includes("/"));
  if (old === undefined) delete process.env.SWIPL_BIN; else process.env.SWIPL_BIN = old;
  const genericRegistry = createPredicateRegistry([
    { name: "entity", arity: 1, kind: "base" },
    { name: "connected_to", arity: 2, kind: "base" },
    { name: "socially_connected", arity: 1, kind: "derived" }
  ]);
  const generic = { schema_version: "ontology-proposal-v0", candidate_version: "cand-generic", facts: [
    { predicate: "connected_to", arguments: ["alice", "bob"] }
  ], rules: [{ id: "r_social", head: { predicate: "socially_connected", arguments: ["P"] }, body: [
    { predicate: "connected_to", arguments: ["P", "bob"] }
  ] }] };
  assert.doesNotThrow(() => validateProposal(generic, genericRegistry));
  assert.equal((await run(generic, { query: "derived", parameters: [] }, { registry: genericRegistry })).status, "ok");
  assert.equal((await run(generic, { query: "derived", parameters: [] })).status, "rejected");
  const declared = { ...generic, registry: [
    { name: "entity", arity: 1, kind: "base" },
    { name: "connected_to", arity: 2, kind: "base" },
    { name: "socially_connected", arity: 1, kind: "derived" }
  ] };
  assert.equal((await run(declared, { query: "derived", parameters: [] })).status, "ok");
  // The immutable/runtime boundary is independent of the caller-supplied
  // registry.  These names cannot be admitted as declarations or terms.
  for (const [name, arity] of [["consult", 1], ["ontology_derived", 1], ["assert", 1], ["retract", 1]]) {
    assert.throws(() => createPredicateRegistry([{ name, arity, kind: "base" }]), { code: "IMMUTABLE_PREDICATE" }, name);
    const unsafe = {
      schema_version: "ontology-proposal-v0", candidate_version: `cand-${name}`,
      registry: [{ name, arity, kind: "base" }], facts: [{ predicate: name, arguments: ["x"] }], rules: []
    };
    assert.equal((await run(unsafe, { query: "derived", parameters: [] })).error.code, "IMMUTABLE_PREDICATE", name);
  }
  const manuallyInjectedUnsafe = { ["consult"]: { arity: 1, kind: "base" } };
  const safeShape = { schema_version: "ontology-proposal-v0", candidate_version: "cand-manual", facts: [], rules: [] };
  assert.equal((await run(safeShape, { query: "derived", parameters: [] }, { registry: manuallyInjectedUnsafe })).error.code, "IMMUTABLE_PREDICATE");
  console.log("ontology-harness ok");
})().catch(e => { console.error(e); process.exitCode = 1; });
