# Alpha report — semantic branch dream v3

Status: `alpha observed-not-scored`; Beta is pending.

On 12 pre-frozen varied English phrasings, Luna produced one complete permitted
connector branch for all 6 bare alternatives and abstained on all 6 explicit
controls. Five bare branches changed the query status from `unknown` to
`contradicted`; one branch (v3-orxor-06) left the queried status `unknown` and
is correctly `stable`. The branch still represents a source-cited connector
alternative, but it does not matter for that particular question.

| Frozen class | Cases | Hypothesis present | Branch-dependent | Stable | No hypothesis |
| --- | ---: | ---: | ---: | ---: | ---: |
| bare alternative | 6 | 6 / 6 | 5 | 1 | 0 |
| explicit XOR variants | 3 | 0 / 3 | 0 | 0 | 3 |
| explicit inclusive-OR variants | 3 | 0 / 3 | 0 | 0 | 3 |

The zero-model-call fail-closed replay reproduced every trace. This alpha
result extends the v2.1 observation to these twelve authored phrasings. It
does not establish general natural-language disambiguation, answer accuracy,
memory usefulness, or a benefit of Prolog. Beta must still verify raw receipts,
blinding, one-token deltas, and replay independently.
