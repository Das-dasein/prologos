# Alpha R7: trusted-proof collector consumes receipt v6

The consumer now emits `candidate-receipt-v6.json` with
`cognitive-proof-eval-receipt-intake-v6`, the v6 authority-registry reference,
and local status `candidate-integrity-collected-not-a-result-v6`. It retains
the v5 authority reader solely to obtain the sealed source/dataset/slot/proof
bindings which v6 deliberately delegates to v5.

`node test-trusted-proof-live-candidate.js` runs a fake-only 24-record P0/P1
bundle through v6. It verifies native `input_tokens`, `output_tokens`, and
`total_tokens`, reconciliation, and `E == input_tokens`; a malformed nested
provider usage response stops collection before `candidate-receipt-v6.json`.
All rejected and mixed scorer matrices still retain attempt evidence but emit
no receipt. The default CLI remains offline with zero provider calls.

No `.cdr/**`, pinned transport source, credentials, provider calls, or live
artifacts were changed. This is an integrity candidate path, not a result or
effect claim.
