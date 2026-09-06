# Alpha R9: trusted-proof collector consumes receipt v7

The consumer now emits `candidate-receipt-v7.json` with
`cognitive-proof-eval-receipt-intake-v7`, the v7 authority-registry reference,
and local status `candidate-integrity-collected-not-a-result-v7`. Its config
and receipt bindings now come directly from the v7 authority registry.

`node test-trusted-proof-live-candidate.js` performs a fake-only 24-record
P0/P1 collection through v7 using an accepted native OpenAI Responses `usage`
shape with input/output detail objects. The receipt retains only the canonical
native counters and verifies reconciliation and `E == input_tokens`. It rejects
arbitrary detail-shape mutations, a missing P1 proof provenance, rejected
scorer decisions, unequal paired E, malformed totals, model/gate failures, and
an existing root without writing a receipt.

No `.cdr/**`, pinned transport source, credentials, provider call, or live
artifact changed. This remains an integrity candidate path, not a result or
effect claim; a user-run collection and fresh CDR beta remain required.
