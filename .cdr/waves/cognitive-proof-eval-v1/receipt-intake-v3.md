# Local receipt intake v3 (issue #38)

V3 is a forward-only, non-result preparation format. It rejects v1 and v2
schema versions; it neither upgrades nor reinterprets historical receipts.

The self-hashing `wire-assembled-prompt-digest-registry-v3.json` rebuilds all
sealed P0/P1 SHA-256 digests and binds the wave inputs, PR #37 transport commit
`4b403d1775c3de727f4f2408cada2408435a849d`, hashes of both transport sources,
the exported literal `{{assembled_prompt}}` and `none` identities, and input
mode `sealed-assembled-prompt-byte-for-byte`. The registry contains only
digests and identities: never prompt bytes, oracle material, provider calls,
raw output, results, or aggregates.

V3 retains every v2 gate: exact case/condition digest, P0/P1 uniqueness and
candidate completeness, proof/source/dataset/slot binding, retry and equal
measured E, leakage rejection, append-only records, and unique local-only
prompt/raw artifacts whose SHA-256 values are verified below `--raw-root`.
The committed fixture is synthetic and non-result only.
