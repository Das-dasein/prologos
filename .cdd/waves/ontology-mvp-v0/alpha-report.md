# Alpha report: ontology-mvp-v0

## Delivered

- `ontology-harness.js` validates the pinned JSON contract fail-closed, compiles
  only snake-case atoms/variables, enforces registered predicates and arities,
  rule safety, collection/source/variable limits, duplicate IDs, and cyclic
  derived dependencies.
- `ontology-runner.pl` is a fixed query dispatcher. The harness never forwards
  a model-provided Prolog goal to SWI-Prolog.
- Candidate programs run in a fresh temporary directory and are removed on
  success and failure. The candidate contains no directives, I/O, assertions,
  retracts, shell calls, or meta-calls.
- `test-ontology-harness.js` covers the accepted example, malformed and unsafe
  proposals, registry rejection, and structured SWI failure. Existing tests
  remain unchanged and green.

## Verification

Commands run:

```text
node test-ontology-harness.js
npm test
```

Both passed (`ontology-harness ok`; `ok`, `memory-store ok`,
`codex-provider ok`). SWI-Prolog is `10.0.2` for `arm64-darwin`; the workspace
has no Git `HEAD`, so no commit SHA was available. The immutable CDR method,
dataset, oracle, claims, thresholds, `memory.pl`, and `data/memory.pl` were not
edited.

## Sample result

The pinned example produces status `ok`, binding `P=user`, value
`knows_multiple_programming_languages`, and supporting rule `r_knows_two`.

## Limitations

The v0 adapter currently exposes the deterministic `derived` example path;
the registered `active_claims`, `conflicts`, and `provenance` paths return empty
arrays because proposal facts are positive ontology facts, not claim records.
No CDR result or product-utility claim is inferred from these synthetic tests.
