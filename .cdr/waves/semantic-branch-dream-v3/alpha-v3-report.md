# Alpha report — semantic branch dream v3

Status: `alpha observed-not-scored`; Beta required the calibration addendum in
`beta-v3-report.md` before Gamma.

On 12 pre-frozen varied English phrasings, Luna produced one complete permitted
connector branch for all 6 bare alternatives and abstained on all 6 explicit
controls. Five bare branches changed the query status from `unknown` to
`contradicted`; one branch (v3-orxor-06) left the queried status `unknown` and
is correctly `stable`. Its reason is not semantic irrelevance: the generated
baseline split `codes(fara)` from the s2 predicate `code(fara)`, so neither OR
nor XOR constrains `design(fara)`. This lexical/modal formalization issue is
preserved as observed and never auto-repaired.

| Frozen class | Cases | Hypothesis present | Branch-dependent | Stable | No hypothesis |
| --- | ---: | ---: | ---: | ---: | ---: |
| bare alternative | 6 | 6 / 6 | 5 | 1 | 0 |
| explicit XOR variants | 3 | 0 / 3 | 0 | 0 | 3 |
| explicit inclusive-OR variants | 3 | 0 / 3 | 0 | 0 | 3 |

The zero-model-call fail-closed replay reproduced every trace. This alpha
result describes these twelve authored phrasings under the expanded v3
instruction, which directly lists their explicit control expressions. It does
not establish generalization of the unchanged v2.1 prompt, general
natural-language disambiguation, translation correctness, answer accuracy,
memory usefulness, or a benefit of Prolog.
