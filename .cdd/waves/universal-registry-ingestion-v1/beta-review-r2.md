# Independent beta review R2: universal-registry-ingestion-v1

Issue: GitHub #15, `CDS: bind memory extraction to the versioned ontology profile`.
Reviewed branch: `cycle/15`.
Reviewed implementation commit: `a3b898c1c62a15954bb2177911945001e27df6ad`.
Parent implementation commit: `e82468e` (repair report records alpha parent `09a81b8`).
Review mode: fresh independent beta review of the immutable alpha repair commit.

## Verdict

**APPROVE**

The R1 repairs close both prior beta findings. Reserved Prolog/runtime predicate
names are rejected by the shared predicate-name validator and therefore fail at
the generated Zod extraction schema and at the deterministic write-boundary
validator. Candidate names already registered in the supplied ontology profile,
including `derived` declarations, are rejected at both boundaries. The focused
and full deterministic regression suites pass, with no source or scope breach
identified in this repair commit.

This is CDD/CDS contract evidence only. It does not provide CDR evidence of
live-model extraction quality, semantic correctness, or ontology completeness.

## Verification of prior findings

### F1 — reserved runtime predicate names

`ontology-registry.js` now centralizes the reserved-name check in
`validatePredicateName`; `validateOntologyCandidateName` calls it before the
registry lookup. `memory-store.js` uses that shared function at the
deterministic write boundary. `llm-schema.js` invokes the same candidate-name
validator in `createExtractionSchema(...).superRefine`, so the schema rejects
every member of `RESERVED_PREDICATES`.

`test-registry-ingestion.js` iterates the complete exported reserved set and
asserts rejection through both `validateOntologyCandidate` and `Extraction.parse`.

### F2 — registered derived predicate names

`validateOntologyCandidateName` checks `registry.predicates`, rather than the
base-only `MEMORY_PREDICATES` projection. The focused test creates a temporary
profile containing the valid derived declaration `derived_activity` and asserts
that both `validateOntologyCandidate(candidate, derivedRegistry)` and
`createExtractionSchema(derivedRegistry).parse(...)` reject the candidate as
already registered.

## Commands and results

All commands ran from the clean checkout at the reviewed commit.

    git rev-parse HEAD
    a3b898c1c62a15954bb2177911945001e27df6ad

    node test-registry-ingestion.js
    registry-ingestion ok

    npm test
    ok
    cdr gold harness ok
    core/domain boundary ok
    memory-store ok
    memory reflection ok
    codex-provider ok
    ontology-harness ok
    elenchus ok
    registry-ingestion ok

    git diff --check a3b898c1c62a15954bb2177911945001e27df6ad^ a3b898c1c62a15954bb2177911945001e27df6ad
    status=0

The parent-to-target diff contains only the candidate-name repair, its focused
tests, and `alpha-repair-report-r1.md`. No CDR files, trusted Prolog rules,
thresholds, datasets, or oracles were changed. No candidate promotion,
candidate execution, or ontology-profile mutation path was introduced.

## Remaining bounded risks

- No live-model run exists; semantic extraction quality and candidate usefulness
  remain unmeasured.
- The generated JSON schema still expresses only syntactic candidate-name shape;
  exact reserved-name and registered-name enforcement remains the post-schema
  Zod/deterministic validation boundary.
- Argument types constrain declarations and candidate fields but do not perform
  entity-instance type checking for assertion atoms.
- Candidate promotion, governance, profile distribution, and version negotiation
  remain out of scope.
- The checked-in Codex schema is equality-tested against its generator, but an
  operator-facing schema regeneration command remains absent.

## Scope

APPROVE is limited to the stated R1 repair of AC5 and regression safety at the
reviewed immutable commit. It is not a gamma receipt or a CDR approval.
