"use strict";
const assert = require("node:assert/strict");
const { auditPredicateNames } = require("./predicate-lexical-audit");
const audit = auditPredicateNames({ program: "domain(person,[fara]).\naxiom(s1,codes(fara)).\naxiom(s2,or(code(fara),design(fara))).", query: "design(fara)" });
assert.deepEqual(audit.suggestions, [{ left: "code", right: "codes", edit_distance: 1, action: "review_source_spelling_only" }]);
assert.match(audit.note, /No predicate is renamed/);
const finiteFol = auditPredicateNames({ program: "world([atom(code,[fara]),atom(codes,[fara])]).", query: "world(Axioms), finite_sat_status([], Axioms, atom(design,[fara]), Status, Certificate)" });
assert.deepEqual(finiteFol.suggestions, [{ left: "code", right: "codes", edit_distance: 1, action: "review_source_spelling_only" }]);
console.log("predicate-lexical-audit ok: near names are advisory only");
