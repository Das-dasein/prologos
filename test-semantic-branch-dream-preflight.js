"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { build, priorIds, sentences } = require("./semantic-branch-dream-preflight");
const rows = Array.from({ length: 500 }, (_, id) => ({ id, context: id < 170 ? "A either sings or dances, but not necessarily both." : id < 340 ? "A either sings or dances." : "A either sings or dances, but not both.", question: `Q${id}`, answer: "A", nl2fol: {}, reasoning: "secret", conclusion_fol: "secret" }));
const fixture = build({ sourceBytes: JSON.stringify(rows), excluded: new Set([0, 170, 340]), seed: "test" });
assert.equal(fixture.cases.length, 12);
assert.equal(fixture.cases.filter(x => x.class === "soft_disjunction").length, 7);
assert.equal(fixture.cases.filter(x => x.class === "no_explicit_exclusivity").length, 2);
assert.equal(fixture.cases.filter(x => x.class === "explicit_exclusive_control").length, 3);
assert.equal(Object.hasOwn(fixture.cases[0], "answer"), false);
assert.deepEqual(sentences("One. Two."), [{ id: "s1", text: "One." }, { id: "s2", text: "Two." }]);
assert.deepEqual(sentences("If Dr. Ada sings. Bob listens."), [{ id: "s1", text: "If Dr. Ada sings." }, { id: "s2", text: "Bob listens." }]);
const root = fs.mkdtempSync(path.join(os.tmpdir(), "sbd-preflight-"));
try {
  const manifestDir = path.join(root, ".cdr", "waves", "luna-thirty-paired-v1"); fs.mkdirSync(manifestDir, { recursive: true });
  fs.writeFileSync(path.join(manifestDir, "manifest.json"), JSON.stringify({ selected_source_ids: [25, 30] }));
  fs.writeFileSync(path.join(root, "prior.json"), "proverqa-hard-481");
  assert.deepEqual([...priorIds(root)].sort((a, b) => a - b), [25, 30, 481]);
} finally { fs.rmSync(root, { recursive: true, force: true }); }
console.log("semantic-branch-dream-preflight ok: selected visible-only stratified sample");
