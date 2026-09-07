"use strict";
const assert = require("node:assert/strict");
const { buildFixture, parseFol, validateFixture } = require("./proverqa-hard-preflight");

function row(id, answer, quantified) {
  const quantifierFormula = quantified ? "∀x (calm(x) → ready(x))" : "calm(Ada) → ready(Ada)";
  return { id, answer, context: `Context ${id}.`, question: `Question ${id}?`, conclusion_fol: "ready(Ada)", nl2fol: { [`Context ${id}.`]: quantifierFormula, "Ada is ready.": "ready(Ada)" } };
}
const rows = Array.from({ length: 500 }, (_, index) => row(index, ["A", "B", "C"][index % 3], index < 100));
assert.equal(parseFol("∀x (calm(x) → ready(x))"), "forall(X, implies(atom(calm(X)), atom(ready(X))))");
assert.equal(parseFol("¬calm(Ada)"), "neg(atom(calm('Ada')))" );
const fixture = buildFixture({ sourceBytes: JSON.stringify(rows), sourceManifest: { schema_version: "proverqa-hard-source-manifest-v1", dataset: "test", split: "hard", source_commit: "test", expected_sha256: "TO_BE_PINNED_BY_PREFLIGHT" }, seed: "test-seed" });
assert.equal(fixture.cases.length, 12);
assert.equal(fixture.cases.filter(item => item.hybrid_quantifier_case).length, 6);
for (const answer of ["A", "B", "C"]) assert.equal(fixture.cases.filter(item => item.source_answer === answer).length, 4);
assert.doesNotMatch(fixture.cases[0].p1.representation, /proof|oracle|solver/i);
assert.doesNotMatch(fixture.cases[0].p1.question, /RESULT:/);
assert.equal(validateFixture(fixture), true);
assert.throws(() => buildFixture({ sourceBytes: JSON.stringify(rows), sourceManifest: { schema_version: "proverqa-hard-source-manifest-v1", dataset: "test", split: "hard", source_commit: "test", expected_sha256: "0".repeat(64) }, seed: "test-seed" }), /do not match pinned source hash/);
console.log("proverqa-hard-preflight ok: deterministic 12-case balanced fixture and six quantified hybrid cases");
