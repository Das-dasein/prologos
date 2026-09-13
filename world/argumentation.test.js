"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { check } = require("./checker");
const { buildArgumentGraph, analyzeDung } = require("./argumentation");

function fixture(programs) {
  return {
    ideas: { version: "argumentation-test-v0", predicates: ["p", "q", "r"].map(name => ({ name, arity: 1 })) },
    items: programs.map((program, index) => ({ id: `a${index}`, source: `event${index}`, program }))
  };
}
function names(graph) {
  const bySupport = new Map(graph.arguments.map(argument => [`${argument.conclusion}:${argument.item_ids.join(",")}`, argument.id]));
  return new Map([
    [bySupport.get("p(orion):a0"), "A"],
    [bySupport.get("neg(p(orion)):a1"), "N"],
    [bySupport.get("q(orion):a2"), "Q"],
    [bySupport.get("r(orion):a0,a3"), "U"],
    [bySupport.get("r(orion):a2,a4"), "V"],
    [bySupport.get("neg(r(orion)):a0,a5"), "W"]
  ]);
}

test("support-attack projection keeps premise attacks and matches the declared finite graph", async () => {
  const receipt = await check({ snapshot: fixture([
    "p(orion).", "neg(p(orion)).", "q(orion).", "r(X) :- p(X).", "r(X) :- q(X).", "neg(r(X)) :- p(X)."
  ]), query: "r(orion)" });
  const graph = buildArgumentGraph(receipt), label = names(graph);
  assert.equal(graph.arguments.length, 6);
  assert.deepEqual(graph.attacks.map(edge => `${label.get(edge.from)}>${label.get(edge.to)}`).sort(), [
    "A>N", "N>A", "N>U", "N>W", "U>W", "V>W", "W>U", "W>V"
  ]);
  const result = analyzeDung(graph);
  assert.deepEqual(result.grounded.map(id => label.get(id)), ["Q"]);
  assert.deepEqual(result.preferred.map(extension => extension.map(id => label.get(id)).sort().join(",")).sort(), ["A,Q,U,V", "A,Q,W", "N,Q,V"]);
});

test("argument projection is bounded and has no authority over action", () => {
  const receipt = { raw_support_sets: [
    { literal: "p(orion)", item_ids: ["a0"] }, { literal: "q(orion)", item_ids: ["a1"] }
  ] };
  assert.throws(() => buildArgumentGraph(receipt, { maxArguments: 1 }), /argument_limit/);
  const graph = buildArgumentGraph(receipt);
  assert.equal("decision" in graph, false);
  assert.throws(() => analyzeDung(graph, { maxArguments: 1 }), /argument_limit/);
});

test("argument projection carries declared provenance groups but does not interpret them", async () => {
  const receipt = await check({
    snapshot: {
      ideas: { version: "argument-source-group-v0", predicates: [{ name: "p", arity: 1 }] },
      items: [{ id: "a0", source: "event_copy", source_group: "original_document", program: "p(orion)." }]
    },
    query: "p(orion)"
  });
  const graph = buildArgumentGraph(receipt);
  assert.deepEqual(graph.arguments[0].source_ids, ["event_copy"]);
  assert.deepEqual(graph.arguments[0].source_group_ids, ["original_document"]);
  assert.equal("source_group_policy" in graph, false);
});
