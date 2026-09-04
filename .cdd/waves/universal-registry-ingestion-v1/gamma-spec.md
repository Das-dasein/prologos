# Gamma specification: universal-registry-ingestion-v1

Decision: bounded GO for alpha implementation.
Issue: GitHub #15. Parent design: GitHub #4.

## Trusted ontology profile

An `ontology-profile-v1` document selects one or more trusted
`ontology-layer-v1` files. Every layer declares types and predicate signatures.
The role is either `core` or `domain`; the role is provenance, not an
authorization level. Duplicate types or predicates, unsafe names, undeclared
argument types, type cycles, paths outside the profile directory, malformed
versions, and unknown keys reject the complete profile.

The active identity is `(name, semantic version, sha256)`. The hash covers the
profile identity, layer order, roles, and complete normalized layer documents.
Changing a declaration therefore invalidates stale extraction output.

## Extraction boundary

`memory-extraction-v2` contains the exact registry identity, zero or more
registered assertion candidates, and zero or more untrusted ontology
candidates. Assertions retain the existing polarity, dates, and confidence
fields. An ontology candidate contains only a safe proposed name, arity,
argument types, meaning, and verbatim evidence span.

Only registered base predicates with exact arity can reach `assertion/2`.
Ontology candidates are diagnostic output: they are not Prolog, cannot declare
themselves valid, and must never be appended to memory or registry files.

## Acceptance checks

1. The active profile visibly separates universal core predicates from the
   conversation-profile domain package.
2. Prompt and both provider validators are generated from the active profile.
3. A stale or fabricated registry identity is rejected before a write.
4. Unknown and wrong-arity assertions are rejected; safe unknown vocabulary is
   allowed only as an ontology candidate.
5. Persisting an extraction with only an ontology candidate leaves memory
   unchanged.
6. The checked-in Codex output schema equals the schema generated from the
   active profile.
7. Existing Prolog, reflection, ontology, Elenchus, and CDR tests remain green.

This contract does not assert that the supplied types are complete common
knowledge, that LLM extraction is semantically accurate, or that a candidate
should be promoted into the World of Ideas.
