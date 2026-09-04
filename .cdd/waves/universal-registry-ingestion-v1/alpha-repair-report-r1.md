# Alpha repair report R1: candidate-name boundary

Issue: GitHub #15.
Parent alpha commit: 09a81b8.
Beta review: 913840852481e700f40b2930fc1ace7dcf64bc76.

## Findings repaired

### F1: Reserved runtime names

Added validatePredicateName in ontology-registry.js. The function is now the
single reserved-name check used by both layer declaration validation and
ontology-candidate validation. MemoryStore and the generated Zod validator
call validateOntologyCandidateName, so names such as assert, consult, and
assertion reject before any durable-memory write.

### F2: Registered derived names

validateOntologyCandidateName checks registry.predicates rather than the
base-only MEMORY_PREDICATES projection. Candidate names therefore reject
against every registered predicate, including derived declarations.

## Evidence

- test-registry-ingestion.js iterates the complete RESERVED_PREDICATES set
  through both the deterministic write-boundary validator and the generated
  Zod validator.
- A temporary profile fixture declares derived_activity as derived and proves
  both validators reject a candidate with that registered name.
- The extraction validator uses an explicit callback when validating candidate
  arrays, preventing Array.forEach from passing an array index as the optional
  registry argument.

## Scope and debt

This repair changes only candidate-name validation and its deterministic
fixtures. It does not promote candidates, execute candidate Prolog, change
CDR data or thresholds, add entity-instance type checking, or claim
live-model semantic quality.

Alpha judgment: F1 and F2 are repaired locally; a fresh independent beta
review of the repair commit remains required.
