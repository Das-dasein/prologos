# Constructed near-signature diagnostic v1

Status: `FROZEN BEFORE MODEL OUTPUT`.

This is a 16-item constructed adversarial diagnostic benchmark: eight
source-supported one-edit naming mismatches and eight English-distinct
one-edit verb controls. It is not an estimate of Luna's natural M0 error rate,
automatic repair, or final-answer accuracy.

`fixture-v1.json` is model-visible and contains only source, immutable program,
and query. `gold-v1.json` is evaluator-only and contains verdicts, expected
pairs, and cited source IDs. Their SHA-256 values are fixed in
`protocol-v1.json`; `protocol-v1.sha256` seals the protocol itself. The runner
reads gold solely to verify that hash before any call and never inserts it into
a prompt.

All 16 candidates pre-execute in fresh Prolog processes and must yield a
nonempty read-only near-signature audit before the raw root is created. Each
case then has two fresh Luna diagnostic calls in frozen counterbalanced order.
M2 adds only the exact audit term. There are no M0 calls, retries, aliases, or
repairs.

Primary scoring compares source-grounded `same_relation` findings with the
evaluator-only verdict: detection on real items and false typo allegations on
controls. Citation validity and paired descriptive deltas are retained.
A local full dashboard will render source, frozen program/query, certificates,
both prompts, raw JSON responses, and scorer decisions.
