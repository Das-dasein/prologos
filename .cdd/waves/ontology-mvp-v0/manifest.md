# CDD wave: ontology-mvp-v0

## Objective

Build the smallest executable path in which an LLM induces a domain-neutral
ontology from dialogue: typed facts, entities and bounded Prolog rules. A
validator accepts or rejects the proposal, and SWI-Prolog executes an isolated
ontology candidate with provenance. Employment examples are fixtures only,
not the ontology vocabulary.

## In scope

- pinned JSON proposal contract for facts and rules;
- fail-closed rule validator;
- isolated candidate compilation and SWI execution;
- deterministic JSON result with supporting claims/rules;
- harness entrypoint suitable for the pending CDR F3 gate.

## Out of scope

- unrestricted Prolog generation;
- ontology quality claims;
- production deployment or UI requirements;
- changing the CDR thresholds or treating synthetic runs as product evidence.

## Definition of done

- one valid rule is accepted and executed by SWI;
- malformed, unsafe and over-sized rules are rejected;
- candidate execution cannot mutate durable memory;
- timeout and non-zero SWI exit are reported as structured failures;
- `npm test` remains green;
- a CDD report records commands, limitations and the immutable artifact set.

## Relationship to CDR

This wave supplies engineering artifacts only. The existing CDR wave
`prolog-memory-eval-v0` may consume a pinned harness from this wave, but still
requires a fresh independent beta audit before any receipt.
