"use strict";
const assert = require("node:assert");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const { validateDataset, validateRecord, scoreAnnotations, DATASET_SHA256 } = require("./cdr-annotation-harness");

const dataset = path.join(__dirname, ".cdr/datasets/extraction-annotation-pilot-v1.jsonl");
const result = validateDataset(dataset);
assert.equal(result.status, "ok");
assert.equal(result.record_count, 8);
assert.equal(result.sha256, DATASET_SHA256);
assert.match(fs.readFileSync(path.join(__dirname, ".cdr/datasets/extraction-annotation-pilot-v1.manifest.md"), "utf8"), new RegExp(DATASET_SHA256));
const score = scoreAnnotations(dataset, path.join(__dirname, ".cdr/datasets/extraction-annotation-seeded-errors-v1.jsonl"));
assert.deepEqual(score.error_counts, { argument: 1, atomicity: 1, coreference: 1, decision: 3, hallucination: 2, modality: 1, polarity: 1, predicate: 1, provenance: 1, time: 1 });
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "cdr-annotation-"));
try {
  const alteredGold = path.join(temp, "altered-gold.jsonl");
  fs.writeFileSync(alteredGold, `${fs.readFileSync(dataset, "utf8")}\n`, "utf8");
  assert.throws(() => validateDataset(alteredGold), { code: "DATASET_SHA256" });
  const privateCandidate = path.join(temp, "private-candidate.jsonl");
  fs.writeFileSync(privateCandidate, fs.readFileSync(path.join(__dirname, ".cdr/datasets/extraction-annotation-seeded-errors-v1.jsonl"), "utf8").replace("I work at Acme and use Python.", "sk-private-marker I work at Acme and use Python."), "utf8");
  assert.throws(() => scoreAnnotations(dataset, privateCandidate), { code: "DATA_POLICY" });
} finally { fs.rmSync(temp, { recursive: true, force: true }); }
assert.throws(() => validateRecord({ case_id: "extract-99", turn: "Maybe I work.", decision: "ignore", assertions: [{ id: "a", predicate: "works_at", arguments: ["user", "acme"], polarity: "positive", modality: "asserted", time: { kind: "unknown" }, source_span: "Maybe" }] }), { code: "NONWRITE_ASSERTIONS" });
assert.throws(() => validateRecord({ case_id: "extract-99", turn: "I work at Acme.", decision: "write", assertions: [{ id: "a", predicate: "works_at", arguments: ["user", "acme"], polarity: "positive", modality: "asserted", time: { kind: "unknown" }, source_span: "not in source" }] }), { code: "PROVENANCE" });
assert.throws(() => validateRecord({ case_id: "extract-99", turn: "I work at Acme.", decision: "write", assertions: [{ id: "a", predicate: "works_at", arguments: ["user", "acme"], polarity: "positive", modality: "asserted", time: { kind: "current" }, source_span: "I work at Acme" }] }), { code: "TIME" });
console.log("cdr annotation ok");
