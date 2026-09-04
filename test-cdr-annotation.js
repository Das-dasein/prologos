"use strict";
const assert = require("node:assert");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const { validateDataset, validateRecord, scoreAnnotations, toV2, DATASET_SHA256 } = require("./cdr-annotation-harness");

const dataset = path.join(__dirname, ".cdr/datasets/extraction-annotation-pilot-v1.jsonl");
const result = validateDataset(dataset);
assert.equal(result.status, "ok");
assert.equal(result.record_count, 9);
assert.equal(result.sha256, DATASET_SHA256);
assert.match(fs.readFileSync(path.join(__dirname, ".cdr/datasets/extraction-annotation-pilot-v1.manifest.md"), "utf8"), new RegExp(DATASET_SHA256));
const score = scoreAnnotations(dataset, path.join(__dirname, ".cdr/datasets/extraction-annotation-seeded-errors-v1.jsonl"));
assert.deepEqual(score.error_counts, { argument: 1, atomicity: 1, coreference: 1, decision: 3, hallucination: 2, modality: 1, polarity: 2, predicate: 2, provenance: 1, time: 1 });
assert.equal(score.category_metrics["stable recall"].decision.denominator, 2);
assert.equal(score.category_metrics["explicit correction/supersession"].decision.rate, null);
assert.deepEqual(toV2({ predicate: "lives_in", arguments: ["user", "omsk"], polarity: "positive", modality: "asserted", time: { kind: "interval", from: "2020-01-01", to: "2022-12-31" }, source_span: "Omsk" }), {
  polarity: "positive", relation: "lives_in", arguments: ["user", "omsk"], valid_from: 20200101, valid_to: 20221231,
  confidence: 1, scope: "self", qualifier: "interval", provenance: { source_span: "Omsk" },
});
assert.throws(() => toV2({ predicate: "not_registered", arguments: ["user"], polarity: "positive", modality: "asserted", time: { kind: "unknown" }, source_span: "x" }), { code: "UNKNOWN_RELATION" });
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
assert.throws(() => validateRecord({ case_id: "extract-99", turn: "I work at Acme.", decision: "write", assertions: [] }), { code: "WRITE_EMPTY" });
assert.throws(() => validateRecord({ case_id: "extract-99", turn: "I work at Acme.", decision: "write", assertions: [{ id: "a", predicate: "works_at", arguments: ["user", "acme"], polarity: "positive", modality: "asserted", time: { kind: "unknown" }, source_span: "not in source" }] }), { code: "PROVENANCE" });
assert.throws(() => validateRecord({ case_id: "extract-99", turn: "I work at Acme.", decision: "write", assertions: [{ id: "a", predicate: "works_at", arguments: ["user", "acme"], polarity: "positive", modality: "asserted", time: { kind: "current" }, source_span: "I work at Acme" }] }), { code: "TIME" });
console.log("cdr annotation ok");
