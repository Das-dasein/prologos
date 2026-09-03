# Alpha repair report r2: ontology-mvp-v0

## Delivered

- Rule provenance is answer-scoped: generated support records include the
  derived predicate and its bound arguments, and the runner joins them to the
  returned answer. A successful unrelated rule is excluded.
- SWI process failures are normalized to deterministic codes/messages
  (`SWIPL_NOT_FOUND`, `TIMEOUT`, or `SWIPL_EXIT`) without stderr, executable,
  runner, or temporary-directory paths.
- Rejected results always contain `candidate_version`; malformed JSON yields
  `null`, while a recoverable top-level candidate version is preserved.
- Added `createPredicateRegistry(declarations)` and registry injection through
  `validateProposal(..., registry)` / `run(..., {registry})`. Declarations are
  explicit `{name, arity, kind}` entries, reserved runtime predicates are
  rejected, and custom domain-neutral base/derived predicates execute through
  the same bounded adapter. The bundled employment-shaped table is retained
  only as a compatibility fixture.

## Focused verification

```text
node test-ontology-harness.js       # ontology-harness ok
npm test                             # ok; memory-store ok; codex-provider ok
swipl --version                      # SWI-Prolog 10.0.2 arm64-darwin
```

Regression coverage includes a successful-but-unrelated rule, path-free SWI
spawn failure, malformed proposal result shape, preserved candidate version,
and a custom explicitly declared non-employment registry.

CDR files, datasets, oracle, claims, thresholds, `memory.pl`, and
`data/memory.pl` were not modified. This remains synthetic engineering
evidence and does not establish CDR or product utility.

## Boundary

The default employment-shaped registry remains available to the existing v0
fixture. Production callers must pass a versioned declaration set explicitly;
undeclared predicates and arbitrary Prolog remain rejected.
