"use strict";
const assert = require("node:assert/strict");
const { checkCandidate, groundGoal } = require("./candidate-checker");
(async () => { assert.equal(groundGoal("ready(ada)"), true); assert.equal(groundGoal("not(ready(ada))"), true); assert.equal(groundGoal("not_ready(ada,bob)"), false); const result = await checkCandidate({ caseId: "candidate-checker-test", program: "domain(person,[ada]).\naxiom(s1, fact(calm(ada))).\naxiom(s2, rule([calm(ada)], ready(ada))).\n", query: "ready(ada)" }); assert.match(result.bindings, /status\(entailed\)/); assert.match(result.bindings, /proof_tree\(ready\(ada\)/); console.log("candidate-checker ok: immutable complete candidate receives FOL status and Horn tree"); })().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
