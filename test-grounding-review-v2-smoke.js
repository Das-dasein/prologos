"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { ACTIVE_GROUNDING_POLICY } = require("./predicate-grounding-policy");
const { collect, loadFixture } = require("./grounding-review-v2-smoke.cjs");

(async () => {
  const fixtureFile = path.join(__dirname, ".cdr/waves/memory-grounding-review-v2-smoke-v1/fixture.json");
  const { fixture } = loadFixture(fixtureFile);
  const model = "fake-grounding-review-v2";
  const previous = process.env.CODEX_MODEL;
  process.env.CODEX_MODEL = model;
  const report = await collect({
    fixtureFile,
    model,
    outputRoot: path.join(fs.mkdtempSync(path.join(os.tmpdir(), "pam-review-v2-smoke-")), "report"),
    invoke: async () => ({
      output_text: JSON.stringify({
        schema_version: "memory-grounding-review-v2",
        candidate_sha256: require("./grounding-review").sha256(require("./ontology-registry").canonicalJson(fixture.candidate)),
        policy_identity: ACTIVE_GROUNDING_POLICY.identity,
        reviews: [{ assertion_index: 0, verdict: "entailed", evidence_span: fixture.source_text, reason: "Bound policy licenses the habitual role verb" }],
      }),
      usage: { input_tokens: 1, cached_input_tokens: 0, output_tokens: 1 },
      stdout: "{}\n",
      stderr: "",
    }),
  });
  if (previous === undefined) delete process.env.CODEX_MODEL;
  else process.env.CODEX_MODEL = previous;
  assert.equal(report.actual_verdict, "entailed");
  assert.equal(report.diagnostics.length, 0);
  assert.equal(report.memory_writes, 0);
  console.log("grounding review v2 smoke ok: policy-bound fake transport and zero writes");
})().catch(error => { console.error(error); process.exitCode = 1; });
