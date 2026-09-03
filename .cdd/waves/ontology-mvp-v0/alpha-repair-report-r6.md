# Alpha repair report R6: empty CDD core registry

## Delivered

- Removed `BASE_PREDICATES` and all employment, education, social, and
  technology predicates from the default ontology registry.
- Kept trusted execution/system predicates in the independent immutable
  denylist; they cannot be introduced through a caller registry.
- Made proposal registries explicit and versioned as
  `predicate-registry-v1` with declarations for predicate name, arity, and
  kind. A proposal without a registry therefore rejects domain facts.
- Converted the old employment/technology examples into explicitly declared
  test fixtures. The legacy `memory-store.js` relation allowlist was not
  changed because it is a separate claim-ingestion path, not CDD core.

## Verification

```text
node test-ontology-harness.js  # ontology-harness ok
npm test                        # ok; memory-store ok; codex-provider ok
git diff --check                # clean
```

The focused tests cover accepted explicit generic registries, rejection of
domain facts without a registry, safety/provenance/error/version behavior,
and candidate isolation. No CDR files were modified and no commit was made.
