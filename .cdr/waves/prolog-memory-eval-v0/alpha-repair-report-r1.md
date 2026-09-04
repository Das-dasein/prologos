# Alpha repair report R1 — bounded F1–F4 contract repair

## Scope and invariants

This repair addresses beta R1 findings F1–F4 from the linked issue #5
annotation oracle and issue #20 matrix contract. It changes no gate threshold, baseline selection rule, provider,
live data, or claim scope. The provider was not invoked.

## Repairs

- **F1 categories:** pinned `extraction-annotation-contract-v1.json` assigns
  every annotation case exactly once to six registered categories. The empty
  correction/supersession row is deterministically reported as `N/A`, rather
  than fabricated as zero.
- **F2 scope/qualifier:** the contract declares allowed values and defaults;
  interval annotations map to qualifier `interval`, while absent qualifiers
  are `N/A`. These labels remain distinct from `time`.
- **F3 v1→v2/profile:** `toV2` pins the active profile name/version/hash,
  rejects unknown relations and arity mismatch, maps ordered fields and
  interval/unknown time deterministically, and routes non-asserted modalities
  out of durable writes.
- **F4 formulas/denominators:** the deterministic scorer emits category rows,
  numerator/denominator/rate, unit, and explicit `N/A` for empty cells. It
  records pre-registered formulas for decision, field accuracy, precision,
  and recall.

Together these changes close the #5 structural oracle handoff and the #20
category-stratified matrix contract at the contract level; they do not claim
that either issue has measured model quality.

## Exact checks

```text
node test-cdr-annotation.js
=> exit 0; cdr annotation ok

node -e 'const h=require("./cdr-annotation-harness"); console.log(h.validateDataset(".cdr/datasets/extraction-annotation-pilot-v1.jsonl"))'
=> status=ok; record_count=9; sha256=7cf87a0f2a7b7f101872364c16d505e8c948825ac060fa2fe2bd5a8a004edf66

node cdr-annotation-harness.js .cdr/datasets/extraction-annotation-pilot-v1.jsonl
=> exit 0; pinned structural validation passed

git diff --check
=> exit 0

npm test
=> exit 1; local dependency `tau-prolog` is absent (`MODULE_NOT_FOUND`);
   this is an environment limitation and not evidence about the repair.
```

## Limitations and explicit non-results

The fixture has no correction/supersession example, so that category is
`N/A`; this repair does not add data. The scorer currently emits the
deterministic decision category slice; live Matrix B values and full natural
language field matching require the separately pinned CDS harness. No model,
provider, extraction precision/recall, answer quality, stale/contradictory
error, threshold result, usefulness claim, novelty claim, or CDR receipt is
established. A fresh independent beta review remains required.
