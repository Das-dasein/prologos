# Alpha repair report r1: ontology-mvp-v0

## Delivered

- Added an explicit domain-neutral predicate registry with fixed arities and
  `base`/`derived` kinds. Employment-shaped names remain registry fixtures;
  validation no longer imports the claim-store relation set as its contract.
- Protected immutable/runtime predicates and restricted proposal rule heads to
  registered derived predicates. A candidate can no longer redefine a base
  relation or runtime predicate.
- Added generated `ontology_support/1` proofs for each accepted rule. The
  runner reports only rule IDs whose bodies actually succeed, sorted
  deterministically; unrelated rules are excluded.
- Registered query parameters are now fail-closed: all v0 queries reject any
  non-empty parameter list before SWI starts, preventing parameterized or
  unsafe query input from becoming a SWI error/path leak.
- Added focused tests for irrelevant-rule provenance, parameter rejection, and
  immutable base-predicate protection.

## Verification

```text
node test-ontology-harness.js       # ontology-harness ok
npm test                             # ok; memory-store ok; codex-provider ok
swipl --version                      # SWI-Prolog 10.0.2 arm64-darwin
```

SHA-256 (working tree artifacts):

```text
ontology-harness.js       71d2450b80143da8b0d216d53ea1474b64823db34e6d974c6c9a8f702c3f8f4a
ontology-runner.pl        0c1e091c8da6277025b103106dca2122b3fe7a2c09acea04262fce774c57f288
test-ontology-harness.js  88370d26dfe85a7b0a38241f6de5188b17eb609ea1028c85d5243b40185f12fe
```

The workspace has no usable Git `HEAD`, so no commit SHA is claimed. CDR
artifacts, datasets, oracle, claims, thresholds, `memory.pl`, and
`data/memory.pl` were not modified. This remains a synthetic engineering
repair and does not establish CDR or product-utility evidence.

## Remaining boundary

The v0 query registry still exposes empty `active_claims`, `conflicts`, and
`provenance` fixture paths; proposal facts are positive ontology facts rather
than claim records. Query parameters are intentionally unsupported until a
future contract defines schemas for them.
