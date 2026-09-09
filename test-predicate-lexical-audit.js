"use strict";
const assert = require("node:assert/strict");
const { auditPredicateNames } = require("./predicate-lexical-audit");
const audit = auditPredicateNames({ program: "domain(person,[fara]).\naxiom(s1,codes(fara)).\naxiom(s2,or(code(fara),design(fara))).", query: "design(fara)" });
assert.deepEqual(audit.suggestions, [{ left: "code", right: "codes", edit_distance: 1, action: "review_source_spelling_only" }]);
assert.match(audit.note, /No predicate is renamed/);
console.log("predicate-lexical-audit ok: near names are advisory only");
