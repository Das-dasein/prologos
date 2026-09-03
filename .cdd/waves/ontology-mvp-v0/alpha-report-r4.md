# Alpha report R4: universal semantic sidecar

## Delivered

- Added `validateSemanticRecord` for the `semantic-dialogue-v1` extraction
  contract from Gamma R1.
- The sidecar validates typed entities and keeps the three meanings distinct:
  `postgraduate_program_completed/2`, `dissertation_note_written/2`, and
  `degree_awarded/2`.
- Each assertion requires explicit `polarity`, `modality`, `time`, and
  `source` fields. Supported time forms are unknown, point, interval, and
  ongoing; unsupported or incomplete provenance is rejected.
- Proposals may carry the sidecar as `semantic_record` (with `semantic` as a
  compatibility alias). Sidecar assertions are intentionally not compiled
  into the executable `ontology-proposal-v0` fact set, which prevents program
  completion, note-writing, or negative/uncertain status from becoming an
  awarded degree.
- Added focused dialogue fixtures for completion, dissertation note, and an
  explicitly negative degree status, plus questioned-modality and type-safety
  regressions.

## Verification

```text
node test-ontology-harness.js  # ontology-harness ok
npm test                        # ok; memory-store ok; codex-provider ok
git diff --check                # clean
```

No CDR files were modified and no commit was created.

## Boundary

This is a bounded extraction-validation sidecar, not a claim that the LLM
extractor is accurate or that the ontology has clinical/product utility.
Semantic records are retained for validation only; projection into v0 still
requires independently validated positive base facts.
