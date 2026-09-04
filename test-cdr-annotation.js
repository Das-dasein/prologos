"use strict";
const assert = require("node:assert");
const path = require("node:path");
const fs = require("node:fs");
const { validateDataset, validateRecord, scoreAnnotations, DATASET_SHA256 } = require("./cdr-annotation-harness");

const dataset = path.join(__dirname, ".cdr/datasets/extraction-annotation-pilot-v1.jsonl");
const result = validateDataset(dataset);
assert.equal(result.status, "ok");
assert.equal(result.record_count, 8);
assert.equal(result.sha256, DATASET_SHA256);
assert.match(fs.readFileSync(path.join(__dirname, ".cdr/datasets/extraction-annotation-pilot-v1.manifest.md"), "utf8"), new RegExp(DATASET_SHA256));
const score = scoreAnnotations(dataset, path.join(__dirname, ".cdr/datasets/extraction-annotation-seeded-errors-v1.jsonl"));
assert.deepEqual(score.error_counts, { atomicity: 1, coreference: 1, decision: 3, hallucination: 2, polarity: 1, time: 1 });
assert.throws(() => validateRecord({ case_id: "extract-99", turn: "Maybe I work.", decision: "ignore", assertions: [{ id: "a", predicate: "works_at", arguments: ["user", "acme"], polarity: "positive", modality: "asserted", time: { kind: "unknown" }, source_span: "Maybe" }] }), { code: "NONWRITE_ASSERTIONS" });
assert.throws(() => validateRecord({ case_id: "extract-99", turn: "I work at Acme.", decision: "write", assertions: [{ id: "a", predicate: "works_at", arguments: ["user", "acme"], polarity: "positive", modality: "asserted", time: { kind: "unknown" }, source_span: "not in source" }] }), { code: "PROVENANCE" });
assert.throws(() => validateRecord({ case_id: "extract-99", turn: "I work at Acme.", decision: "write", assertions: [{ id: "a", predicate: "works_at", arguments: ["user", "acme"], polarity: "positive", modality: "asserted", time: { kind: "current" }, source_span: "I work at Acme" }] }), { code: "TIME" });
console.log("cdr annotation ok");
