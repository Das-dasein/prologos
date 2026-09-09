"use strict";
// Freeze model-visible inputs separately from evaluator-only gold before calls.
const crypto = require("node:crypto");
const fs = require("node:fs");
const sourceFile = "reports/luna-thirty-error-probes/source-excerpts.json";
const wave = ".cdr/waves/near-signature-reflection-v1";
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const stable = value => JSON.stringify(value, null, 2) + "\n";
const sourceText = fs.readFileSync(sourceFile, "utf8"), source = JSON.parse(sourceText);
const selected = source.records.filter(record => record.id !== 378).sort((left, right) => left.id - right.id);
if (selected.length !== 12) throw new Error("expected exactly 12 records after excluding development case 378");
const fixture = Object.freeze({ schema_version: "near-signature-reflection-fixture-v1", status: "frozen-before-model-output", source_file: sourceFile, source_sha256: sha256(sourceText), excluded_source_ids: [{ id: 378, reason: "used while developing the diagnostic; excluded before this fixture was written" }], cases: selected.map(record => ({ case_id: `nsr-${record.id}`, source_id: record.id, world: Object.keys(record.nl2fol).map((text, index) => ({ id: `s${index + 1}`, text })), question: record.question })) });
const gold = Object.freeze({ schema_version: "near-signature-reflection-gold-v1", status: "evaluator-only-not-model-input", source_file: sourceFile, source_sha256: sha256(sourceText), cases: selected.map(record => ({ case_id: `nsr-${record.id}`, source_id: record.id, answer: record.answer, conclusion_fol: record.conclusion_fol, nl2fol: record.nl2fol })) });
fs.mkdirSync(wave, { recursive: true });
fs.writeFileSync(`${wave}/fixture-v1.json`, stable(fixture));
fs.writeFileSync(`${wave}/gold-v1.json`, stable(gold));
console.log(JSON.stringify({ fixture_cases: fixture.cases.length, fixture_sha256: sha256(stable(fixture)), gold_sha256: sha256(stable(gold)) }, null, 2));
