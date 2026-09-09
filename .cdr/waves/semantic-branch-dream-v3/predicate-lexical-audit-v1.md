# Post-Gamma advisory lexical audit — v3

Scope: the 12 saved v3 baseline candidates. This is a diagnostic addendum; it
does not change Alpha, Beta, Gamma, execution, or any candidate.

The audit enumerated non-reserved predicate-like names in each `program +
query` and emitted pairs with edit distance at most one. It found one pair:

| Case | Program names | Suggestion | Source review |
| --- | --- | --- | --- |
| v3-orxor-06 | `codes/1`, `code/1`, `design/1` | `code/1` ↔ `codes/1` | Worth review: “Fara codes” and “Fara can either code or design” are morphologically related. The source also changes modality/action, so the audit cannot establish an alias. |

The other 11 candidates produced no near-name suggestion under this threshold.
That is a coverage observation for this tiny set, not a precision estimate or
evidence that edit distance identifies semantic equivalence.

Action contract: show the pair to a reviewer; never rewrite the candidate,
assert an alias, or alter a Prolog conclusion automatically.
