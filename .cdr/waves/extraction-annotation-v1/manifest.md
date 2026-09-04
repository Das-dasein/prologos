# CDR wave: extraction-annotation-v1

## Objective

Make the target of dialogue-to-memory extraction auditable before evaluating a
model: independent atomic assertions, explicit negation, qualifiers, and
non-write decisions.

## Scope

- synthetic/sanitized turn-level annotation fixture;
- stable annotation schema and error taxonomy;
- deterministic structural validator and positive/negative fixture checks;
- explicit separation between annotation validity and LLM quality.

## Out of scope

- provider calls, extraction metrics, comparison claims, migration of the
  legacy extractor, durable-memory mutation, and changing CDR thresholds.

## Gate

Alpha may establish only that the annotation contract is structurally
executable. A fresh CDR beta must audit annotation adequacy and data policy
before this fixture becomes an extraction evaluation oracle.
