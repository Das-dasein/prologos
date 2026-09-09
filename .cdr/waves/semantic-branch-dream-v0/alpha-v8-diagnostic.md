# Luna semantic branch dream v8 — diagnostic report

Status: `observed-not-scored`, not a CDR receipt.

The frozen 12-case visible-only sample completed through the baseline,
bounded-hypothesis, and isolated Prolog stages. No gold answer, `nl2fol`, or
source reasoning was sent to Luna.

| Outcome | Cases |
| --- | ---: |
| `stable` | 5 |
| `branch_dependent` | 3 |
| `unresolved` | 4 |
| rejected by transport/schema | 0 |

The three dependency cases are source IDs 123, 284, and 434. Their baseline
statuses changed respectively from `contradicted` to `unknown`, `entailed` to
`conflict`, and `unknown` to `entailed` in at least one complete alternative
candidate. This establishes only sensitivity to a recorded model hypothesis.
It does not establish that the alternative is correct, that Luna improved, or
that a final answer should be overridden.

Raw evidence: `raw-luna-v8-20260909/`. Earlier `raw-luna-v1` through `v7`
directories are rejected setup attempts and are excluded from this report.

Next gate: a fresh CDR beta session must independently inspect sample hashes,
raw receipts, source citations, candidate hashes, and clean replay before any
observed or computed research claim is issued.
