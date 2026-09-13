"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { ACTIVE_ONTOLOGY } = require("./ontology-registry");
const { ACTIVE_GROUNDING_POLICY } = require("./predicate-grounding-policy");

const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const assertion = (relation, args) => ({ polarity: "positive", relation, arguments: args, valid_from: null, valid_to: null });
const cases = [
  ["Я работаю в Acme.", "write", [assertion("works_at", ["user", "acme"])], "literal_organization"],
  ["Я работаю в Кэндзи.", "clarify", [], "transliterated_organization"],
  ["Я живу в Porto.", "write", [assertion("lives_in", ["user", "porto"])], "literal_place"],
  ["Я живу в Москве.", "clarify", [], "translated_place_identity"],
  ["Я учусь в Minerva University.", "write", [assertion("studies_at", ["user", "minerva_university"])], "literal_university"],
  ["Я учусь в Сорбонне.", "clarify", [], "transliterated_university"],
  ["Я знаю PostgreSQL.", "write", [assertion("knows_technology", ["user", "postgresql"])], "literal_technology"],
  ["Я знаю Питон.", "clarify", [], "transliterated_technology"],
  ["Я работал с Rust.", "write", [assertion("worked_with_technology", ["user", "rust"])], "literal_past_technology"],
  ["Я работал с Растом.", "clarify", [], "transliterated_past_technology"],
  ["Мой прошлый проект — Atlas.", "write", [assertion("previous_project", ["user", "atlas"])], "literal_project"],
  ["Мой прошлый проект — Атлас.", "clarify", [], "transliterated_project"],
  ["Я наставник младших разработчиков.", "write", [assertion("role", ["user", "mentor"])], "translated_role_kind"],
  ["Я интересуюсь темпоральной логикой.", "write", [assertion("interested_in", ["user", "temporal_logic"])], "translated_concept"],
  ["Я предпочитаю чай.", "write", [assertion("prefers", ["user", "tea"])], "translated_common_thing"],
  ["Я использую молоток каждый день.", "write", [assertion("uses", ["user", "hammer"])], "translated_used_thing"],
];

function build(outputRoot) {
  if (fs.existsSync(outputRoot)) throw new Error("identity control root already exists");
  fs.mkdirSync(outputRoot, { recursive: true, mode: 0o700 });
  const fixture = cases.map(([sourceText, , , category], index) => ({
    case_id: `id-${String(index + 1).padStart(2, "0")}`,
    category,
    source_text: sourceText,
    ontology_identity: ACTIVE_ONTOLOGY.identity,
    policy_identity: ACTIVE_GROUNDING_POLICY.identity,
  }));
  const gold = cases.map(([, expectedDecision, assertions, category], index) => ({ case_id: `id-${String(index + 1).padStart(2, "0")}`, category, expected_decision: expectedDecision, assertions }));
  const fixtureText = `${fixture.map(JSON.stringify).join("\n")}\n`;
  const goldText = `${gold.map(JSON.stringify).join("\n")}\n`;
  fs.writeFileSync(path.join(outputRoot, "fixture.jsonl"), fixtureText, { flag: "wx", mode: 0o600 });
  fs.writeFileSync(path.join(outputRoot, "gold.jsonl"), goldText, { flag: "wx", mode: 0o600 });
  fs.writeFileSync(path.join(outputRoot, "control.json"), `${JSON.stringify({ schema_version: "product-extraction-v5-identity-control-v1", cases: cases.length, expected_writes: 10, expected_clarifications: 6, ontology_identity: ACTIVE_ONTOLOGY.identity, policy_identity: ACTIVE_GROUNDING_POLICY.identity, fixture_sha256: sha256(fixtureText), gold_sha256: sha256(goldText) }, null, 2)}\n`, { flag: "wx", mode: 0o600 });
}

if (require.main === module) {
  if (!process.argv[2]) throw new Error("usage: node build-product-extraction-v5-identity-control.cjs OUTPUT_ROOT");
  build(path.resolve(process.argv[2]));
}
module.exports = { build, cases };
