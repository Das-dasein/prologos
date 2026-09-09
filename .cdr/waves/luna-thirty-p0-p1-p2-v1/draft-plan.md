# P0/P1/P2 answer experiment — development draft, no model calls

## Purpose

Separate the value of executable Prolog output from the value of merely showing
an immutable Prolog representation on the same original ProverQA question.

## Frozen development subset

`128, 336, 300, 155, 292, 404` from `luna-thirty-paired-v1`: the six lowest
values of `SHA256("core-answer-ablation-v1:" + id)` over the existing 30 IDs.

The earlier result is known for all 30, so this remains development data rather
than independent evaluation. ID 404 has an invalid saved program and stays in
the subset as observed execution evidence; no case replacement is allowed.

## Three fresh answer conditions per case

| condition | model sees |
|---|---|
| P0 | original English world, original question and A/B/C answer contract only |
| P1 | identical P0 text plus the saved immutable program and query; no solver output |
| P2 | identical P1 text plus the saved execution certificate only |

P1/P2 must import the exact saved formalization from
`luna-thirty-paired-v1/raw-r1-verdicts`, never generate or repair it. Each
condition is a fresh session. The final answer is one of A/B/C. Gold stays
scorer-only. The total is 18 calls, with a frozen counterbalanced condition order.

## Primary observations

Report all six answers by condition, paired P0→P1 and P1→P2 changes, and match
to existing scorer-only gold. Do not collapse them into a causal accuracy claim:
P0 is newly sampled, selected cases are development data, and P2 has more text.
The key falsifiable result is whether P2 changes a P1 answer in the direction of
gold on any selected original question. A no-change result is valid evidence that
this executable certificate did not help this model on this slice.

## Gates before freeze

1. Verify six original world/question bytes against `cases.json`.
2. Verify imported program/query hashes against the saved formalization receipt.
3. Execute each imported candidate in a fresh Prolog process and preserve its
   certificate; retain invalid execution evidence without replacing the case.
4. Freeze fixture, scorer-only gold, prompts, schema, order and hashes before
   any answer call.
5. Independently review that P0/P1/P2 differ only as stated and that no answer,
   gold or source proof sidecar reaches a prompt.
