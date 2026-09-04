# Alpha report: extraction-annotation-v1

## Produced matter

- A separate eight-turn synthetic annotation fixture distinguishes atomic
  conjunctions, direct negation, interval time, hypothetical/question/reported
  non-writes, and ambiguous coreference.
- `cdr-annotation-harness.js` validates the contract before any provider call.
  It checks exact keys, decision/assertion compatibility, safe atoms,
  polarity/modality, explicit time form, source-span containment, and duplicate
  case/assertion identifiers.
- `test-cdr-annotation.js` supplies negative checks for writing on an ignore
  turn, fabricated provenance, and an undeclared time kind.

## Commands

```text
npm run test:cdr-annotation  PASS
npm test                      PASS
npm run test:cdr-gold         PASS, existing B5 symbolic slice 12/12
git diff --check              PASS
```

## Calibration and beta request

The result is only a structural annotation-contract check. No LLM was called,
no extraction precision/recall or comparison metric was calculated, and no
claim in `.cdr/POLICY.md` is changed. A fresh CDR beta must review whether the
atomicity decisions, category coverage, source-span policy, and taxonomy are
adequate before this fixture can serve as an extraction evaluation oracle.
