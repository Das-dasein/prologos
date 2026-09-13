"use strict";

const assert = require("node:assert/strict");
const { ACTIVE_ONTOLOGY } = require("./ontology-registry");
const { inspectExtractionCandidateV2PolicyIdentity } = require("./extraction-admission");

const candidate = (source, relation, args) => ({
  schema_version: "memory-extraction-v4",
  registry_identity: ACTIVE_ONTOLOGY.identity,
  decision: "write",
  clarification: null,
  assertions: [{ polarity: "positive", relation, arguments: args, valid_from: null, valid_to: null, confidence: 0.9, evidence_span: source }],
  ontology_candidates: [],
});

const transliterated = candidate("Я работаю в Кэндзи.", "works_at", ["user", "kendzi"]);
assert.deepEqual(inspectExtractionCandidateV2PolicyIdentity(transliterated, transliterated.assertions[0].evidence_span).map(item => item.code), ["unadmitted_non_ascii_identity"]);

const literalLatin = candidate("Я работаю в Acme.", "works_at", ["user", "acme"]);
assert.deepEqual(inspectExtractionCandidateV2PolicyIdentity(literalLatin, literalLatin.assertions[0].evidence_span), []);

const lexicalRole = candidate("Я наставник младших разработчиков.", "role", ["user", "mentor"]);
assert.deepEqual(inspectExtractionCandidateV2PolicyIdentity(lexicalRole, lexicalRole.assertions[0].evidence_span), []);

const translatedConcept = candidate("Я интересуюсь темпоральной логикой.", "interested_in", ["user", "temporal_logic"]);
assert.deepEqual(inspectExtractionCandidateV2PolicyIdentity(translatedConcept, translatedConcept.assertions[0].evidence_span), []);

const translatedThing = candidate("Я предпочитаю чай.", "prefers", ["user", "tea"]);
assert.deepEqual(inspectExtractionCandidateV2PolicyIdentity(translatedThing, translatedThing.assertions[0].evidence_span), []);

const spacedAtom = candidate("Я учусь в Minerva University.", "studies_at", ["user", "minerva_university"]);
assert.deepEqual(inspectExtractionCandidateV2PolicyIdentity(spacedAtom, spacedAtom.assertions[0].evidence_span), []);

const projectIdentity = candidate("Я работаю в Acme над проектом Атлас.", "current_project_at", ["user", "acme", "atlas"]);
assert.deepEqual(inspectExtractionCandidateV2PolicyIdentity(projectIdentity, projectIdentity.assertions[0].evidence_span).map(item => item.path), ["$.assertions[0].arguments[2]"]);

console.log("extraction policy identity validator ok: unadmitted non-ASCII identity blocked without rejecting literal Latin or role translation");
