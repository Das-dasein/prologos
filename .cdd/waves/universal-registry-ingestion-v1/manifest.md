# CDD wave: universal-registry-ingestion-v1

Issue: GitHub #15, `CDS: bind memory extraction to the versioned ontology profile`.
Parent design: GitHub #4, `CDD: universal ontology registry and semantic extraction`.

## Objective

Replace the JavaScript relation allowlist with one versioned ontology profile
composed from a shared core layer and optional domain layers. Bind structured
LLM extraction to the exact profile identity and preserve proposed vocabulary
extensions without mutating Prolog memory or the trusted registry.

## Boundary

- This is CDD implementation evidence, not CDR evidence of extraction quality.
- The shared core is a meta-ontology, not an encyclopedic world model.
- The existing profile predicates move to an explicitly named domain layer.
- Unknown predicates fail closed as assertions. A model may emit an ontology
  candidate, but only a later reviewed Demiurge workflow may change a registry.
- Entity-type checking and automatic registry evolution are out of scope.

## Definition of done

- no memory predicate signature is hard-coded in `memory-store.js` or the LLM
  prompt module;
- registry identity is content-addressed and checked at the write boundary;
- prompt, Zod validation, Codex JSON schema, and serializer use the same loaded
  profile;
- ontology candidates are returned but never serialized to `.pl`;
- deterministic tests cover stale identity, unknown predicates, arity, registry
  layering, schema drift, and no-mutation behavior;
- a fresh beta session audits the immutable implementation commit.
