# Local receipt intake v1 (issue #32)

This is a versioned, append-only **local** intake format for a later
human-operated P0/P1 run. It is not a CDR result format and never calculates
an effectiveness score.

`receipt-intake-v1.schema.json` gives the portable envelope shape; the paired
deterministic validator is authoritative for closed-world bindings and gates.
Each envelope binds the source commit, dataset, slot-registration, and
trusted-proof-digest-registry hashes,
model, adapter, both prompt hashes, sampling and retry policy. Each record
repeats that canonical run binding by SHA-256, then
binds a dataset case's canonical snapshot/query hashes, registered slot size,
condition-specific proof reference, raw local reference and SHA-256, measured
effective budget `E`, provider usage, and a scorer decision/contract hash.

Raw output is never copied into this repository. A real `raw.ref` is a
`local://` path resolved only under the operator-provided `--raw-root`; the
validator hashes that local file before a candidate receipt is admitted. The
committed synthetic fixture has deliberately nonexistent local references and
is accepted only as `synthetic_non_result`; it is not provider output and is
not aggregable.

Candidate receipts must contain exactly one P0 and P1 record for every
registered dataset case. The validator rejects absent or duplicate pairs,
wrong source/dataset/slot/snapshot/query/registry binding, changed paired run
fields, wrong raw hash, unequal `E`, P0 proof or a P1 digest that does not
exactly equal that case's canonical registry digest, retry mismatch,
oracle/control leakage, duplicated raw references, and any `supersedes` value.
Thus an accepted record is never replaced in place; corrections are a new
operator submission and fresh audit, not mutation of an admitted receipt.

The scorer object intentionally contains only an opaque contract hash and a
decision label. It must not contain answer-contract/oracle text. A complete
candidate is still `INDETERMINATE` until the separate human run and fresh CDR
beta audit; missing evidence is rejected before aggregation.
