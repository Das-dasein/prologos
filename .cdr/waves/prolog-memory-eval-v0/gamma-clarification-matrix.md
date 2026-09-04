# Gamma clarification: evaluation matrices

Issue: GitHub #20.
Related CDR work: #5 (extraction annotation) and #7 (falsifiable evaluation
method).
Status: pre-registered output shape; no model result.

## Decision

The next pilot emits two linked matrices from the same synthetic dialogues,
gold operations and fixed B1--B5 protocol. The matrices describe how results
will be inspected; they do not add metrics, alter thresholds or authorize a
claim.

## Matrix A — extraction quality

Rows are the six registered dialogue categories. Cells contain exact-match or
declared rate values, with the denominator and error examples retained in the
raw machine-readable output.

| Category | Decision | Assertion exact match | Write P/R | Predicate | Arguments | Polarity | Time | Modality | Provenance | Hallucination | False clarification |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Stable recall | | | | | | | | | | | |
| Correction / supersession | | | | | | | | | | | |
| Temporal change | | | | | | | | | | | |
| Direct positive/negative conflict | | | | | | | | | | | |
| Non-memory | | | | | | | | | | | |
| Ambiguity / coreference | | | | | | | | | | | |

`write` precision and recall are operation-level first, then field-level.
False clarification is measured only over non-ambiguous durable turns;
hallucination is an unsupported durable assertion. A negative assertion is not
scored as a missing positive assertion.

## Matrix B — comparative memory conditions

Rows are the pre-registered conditions; B5 remains an oracle ceiling and is not
a user-facing comparison.

| Condition | Write P/R | Active-state accuracy | Conflict accuracy | Provenance completeness | False clarification | Stale/contradictory error |
|---|---:|---:|---:|---:|---:|---:|
| B1 recent turns only | | | | | | |
| B2 rolling text summary | | | | | | |
| B3 typed claims, no Prolog rules | | | | | | |
| B4 typed claims plus Prolog | | | | | | |
| B5 B4 with gold claims (oracle ceiling) | | | | | | |

The strongest non-Prolog baseline is still selected by the method's declared
pre-registration rule before answer outputs are inspected. All conditions use
the same model, prompt family, sampling and effective context budget; only the
memory mechanism varies.

## Boundary and handoff

The scorer may emit both matrices, category-stratified values, denominators,
error taxonomy and raw JSONL references. It must preserve source commit,
dataset/config hashes and beta reproduction metadata. It must not infer a
causal explanation from a cell, call an architecture successful, or hide an
indeterminate denominator.

This clarification remains subordinate to `.cdr/POLICY.md`, the pinned method,
and the annotation oracle. Fresh CDR beta must review the annotation/method
adequacy before the matrices are consumed for a live model run.
