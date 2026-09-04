# Alpha repair report R1: extraction-annotation-v1

This repair responds to the independent beta `REVISE` findings. It remains a
preparatory annotation contract, not an extraction measurement.

## Repairs

- The pilot dataset SHA-256 is now pinned in its manifest and enforced by the
  validator.
- The validator rejects known private-data markers before scoring.
- A deterministic annotation scorer compares structurally valid predictions to
  the gold fixture and emits only the pre-registered error taxonomy.
- A synthetic seeded-errors fixture exercises atomicity, polarity, predicate,
  argument, time, modality, provenance, decision, hallucination, and
  coreference labels with exact expected counts.

## Re-run evidence

```text
npm run test:cdr-annotation  PASS
npm test                      PASS
npm run test:cdr-gold         PASS, existing B5 12/12
git diff --check              PASS
```

## Remaining boundary

No provider call, precision/recall calculation, baseline comparison, or
utility claim has been added. The scorer is an exact fixture oracle, not a
semantic-equivalence scorer; beta must decide whether current synthetic
coverage is adequate for the preparatory issue scope.
