# Universal ontology registry and semantic extraction v0

Status: design artifact for GitHub issue #4. This is an exploratory design,
not evidence that extraction quality or ontology quality has been established.

## Ownership boundary

One versioned registry is the authority for predicate name, arity, argument
types, qualifier compatibility, and provenance requirements. The registry is
used by both CDD ontology proposals and CDR extraction records. The existing
legacy extraction schema remains compatible until a separate migration issue is
reviewed; it is not widened implicitly.

```json
{
  "schema_version": "semantic-dialogue-v1",
  "registry": {"name": "universal", "version": "v0", "sha256": "..."},
  "entities": [{"id": "person_1", "type": "person"}],
  "assertions": [{
    "id": "a1", "predicate": "works_at", "arguments": ["person_1", "org_1"],
    "polarity": "positive", "modality": "asserted",
    "time": {"kind": "unknown"},
    "source": {"kind": "dialogue", "turn": "t1", "span": "..."}
  }]
}
```

The LLM proposes this data only. Deterministic validation accepts declared
predicates with matching arity and compatible argument/value types, and rejects
undeclared predicates, wrong arity, fabricated provenance, unsafe identifiers,
and incompatible qualifiers. No extraction record directly mutates durable
memory or the trusted registry.

## Compatibility decisions

1. Registry identity is `(name, version, sha256)` and is required in every
   accepted record.
2. Predicate declarations are separate from assertions and cannot shadow core
   lifecycle predicates.
3. Polarity, modality, time, and provenance are first-class fields. If the
   legacy serializer cannot preserve one, projection is rejected as unresolved.
4. `unknown` time is not “current”; missing values remain explicit.
5. Questions, uncertainty, and negative statements remain extraction output and
   are not silently converted to positive facts.
6. Legacy `claim/7` compatibility, registry distribution, and version
   negotiation are separate follow-up work.

## Deterministic examples

The paired fixture `semantic-extraction-registry-v0.json` is the review oracle:

- valid: declared `works_at/2` with two declared entities and dialogue source;
- invalid: undeclared predicate;
- invalid: `works_at/1` wrong arity;
- invalid: missing registry identity;
- invalid: unresolved source projected as an asserted fact;
- valid extraction but non-projectable: explicit negative assertion when the
  legacy positive-fact projection cannot preserve polarity.

## Acceptance mapping

- AC1: registry ownership, identity, and valid/invalid examples above.
- AC2: legacy schema remains unchanged; unknown relation fails closed.
- AC3: this document names exact source/target contracts and deferred migration.

## Follow-up cell

Implement the registry/extraction bridge only after review of this design. The
implementation must add deterministic schema tests and a no-mutation test; it
must not claim live-model semantic accuracy from schema validation alone.
