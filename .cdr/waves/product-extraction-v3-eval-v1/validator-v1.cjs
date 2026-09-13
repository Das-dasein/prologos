"use strict";

const { validateExtraction } = require("../../../memory-store");

function inspectExtractionCandidateV1(candidate, sourceText) {
  const diagnostics = [];
  try {
    validateExtraction(candidate);
  } catch (error) {
    return [{ code: "schema_invalid", path: "$", message: error.message }];
  }
  candidate.assertions.forEach((assertion, index) => {
    if (candidate.schema_version === "memory-extraction-v2") {
      diagnostics.push({ code: "legacy_assertion_without_evidence", path: `$.assertions[${index}]`, message: "product admission requires memory-extraction-v3 evidence on every assertion" });
    } else if (!sourceText.includes(assertion.evidence_span)) {
      diagnostics.push({ code: "assertion_evidence_not_verbatim", path: `$.assertions[${index}].evidence_span`, message: "assertion evidence_span must be a verbatim substring of the user message" });
    }
    if (assertion.valid_from !== null && assertion.valid_to !== null && assertion.valid_from > assertion.valid_to) {
      diagnostics.push({ code: "invalid_interval", path: `$.assertions[${index}]`, message: "valid_from must not be later than valid_to" });
    }
  });
  const names = new Map();
  candidate.ontology_candidates.forEach((ontologyCandidate, index) => {
    if (!sourceText.includes(ontologyCandidate.evidence_span)) {
      diagnostics.push({ code: "evidence_span_not_verbatim", path: `$.ontology_candidates[${index}].evidence_span`, message: "evidence_span must be a verbatim substring of the user message" });
    }
    if (names.has(ontologyCandidate.name)) {
      diagnostics.push({ code: "duplicate_ontology_candidate", path: `$.ontology_candidates[${index}].name`, message: `ontology candidate ${ontologyCandidate.name} duplicates index ${names.get(ontologyCandidate.name)}` });
    } else names.set(ontologyCandidate.name, index);
  });
  return diagnostics;
}

module.exports = { inspectExtractionCandidateV1 };
