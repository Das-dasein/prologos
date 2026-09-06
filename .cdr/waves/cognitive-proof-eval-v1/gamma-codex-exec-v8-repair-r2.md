# Gamma CDR repair R2 — v8 non-result and stderr closure

## β R2 findings

β R2 (`9905c97`) reproduced two remaining fail-open paths:

1. a `synthetic_non_result` envelope with `records: []` bypasses record/run/
   scorer/artifact checks and P0/P1 cardinality;
2. a candidate's `raw.stderr` reference is not resolved or hash-checked, so a
   post-collection stderr mutation remains integrity-valid.

## Required alpha repair

Only adjust v8 validator/schema/fixture/tests.

- Every v8 envelope kind, including `synthetic_non_result`, must contain the
  exact registered P0/P1 set (24 unique records); its records must undergo the
  same closed-shape/run/scorer/artifact checks.  The synthetic fixture remains
  non-aggregable by its `kind`, not by omitting evidence.
- Every raw member `stdout`, `stderr`, and `final_output` must use an exact
  safe local ref/hash, resolve under raw root for candidates, be hash-checked,
  be unique across the candidate, and participate in raw evidence validation.
  `stderr` content need not be semantically parsed, but it cannot be mutable
  or unbound.
- Add direct falsifiers for empty/partial/duplicate synthetic records and
  stderr path/hash/content/duplicate mutations.

## Boundaries

No live Codex, credential, v7/OpenAI, collector command, config authority,
dataset, evaluator/scorer semantics, or outcome change. Fresh β R3 is required.
