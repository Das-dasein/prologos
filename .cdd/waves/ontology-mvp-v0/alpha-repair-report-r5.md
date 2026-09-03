# Alpha repair report R5: generic semantic registry

## Delivered

- Removed the hardcoded semantic predicate vocabulary from
  `ontology-harness.js`. `validateSemanticRecord` now requires a versioned
  `semantic-predicate-registry-v1` containing explicit predicate names,
  arities, and entity types for each argument position.
- Kept the existing deterministic checks for entity/assertion shape, limits,
  atom safety, polarity, modality, time, and provenance. Predicate meaning is
  accepted only when declared by the record's registry; employment, education,
  and technology names have no privileged behavior.
- Updated postgraduate cases to be a declared fixture vocabulary. Completion,
  dissertation-note writing, and degree award remain separate assertions;
  completion does not imply a degree.
- Added a custom sensor/reading/device semantic fixture and unknown-predicate
  regression, demonstrating domain-neutral validation.

## Verification

```text
node test-ontology-harness.js  # ontology-harness ok
npm test                        # ok; memory-store ok; codex-provider ok
git diff --check                # clean
```

No CDR files were modified and no commit was created.

## Boundary

This remains bounded deterministic validation. Registry declarations do not
prove that an extractor is correct, and semantic sidecars are not projected
into executable v0 facts unless a separate loss-aware projection accepts them.
