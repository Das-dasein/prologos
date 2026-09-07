"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { collect, promptFor } = require("./free-prolog-diagnostic-collector");

(async () => {
  const fixture = { schema_version: "free-prolog-diagnostic-fixture-v1", cases: [{ case_id: "small", context: "Ada is ready.", question: "Is Ada ready?" }] };
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "free-prolog-collector-"));
  try {
    assert.match(promptFor(fixture.cases[0]), /ordinary SWI-Prolog source/); assert.doesNotMatch(promptFor(fixture.cases[0]), /self-check/); assert.match(promptFor(fixture.cases[0], "v2-self-check"), /self-check/); assert.match(promptFor(fixture.cases[0], "v3-optional-semantics"), /finite_status/); assert.match(promptFor(fixture.cases[0], "v4-surface-semantics"), /semantic_status/); assert.match(promptFor(fixture.cases[0], "v5-relevant-slice"), /semantic_slice_status/);
    const result = await collect({ fixture, rawRoot: path.join(parent, "raw"), promptVersion: "v2-self-check", generate: async () => ({ program: "ready(ada).\n", query: "ready(ada)" }) });
    assert.equal(result.status, "observed-not-scored"); assert.equal(result.prompt_version, "v2-self-check"); assert.equal(result.records.length, 1); assert.equal(result.records[0].observation.runtime.transcript.exitCode, 0); assert.equal(result.records[0].observation.execution_outcome, "succeeded"); assert.equal(result.records[0].transport_error, null);
    console.log("free-prolog-diagnostic-collector ok: raw ordinary Prolog observation remains non-scoring");
  } finally { fs.rmSync(parent, { recursive: true, force: true }); }
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
