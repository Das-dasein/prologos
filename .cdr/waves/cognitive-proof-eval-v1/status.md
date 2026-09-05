# Wave status: cognitive-proof-eval-v1

- State: `GO_OFFLINE_METHOD_DATASET_EQUAL_SLOT`
- Alpha immutable-slot-binding repair: `59a3aedfa57185c1f41b395d5e610f371955e681`.
- Fresh beta R2: `db5d8c01c5328ee7288946d07f28b0a927865da7` — GO for
  method repair only; it reproduced registration hash and all negative proofs.
- Earlier alpha material: `756ad31dc7dbbf28f1eab0e2f7f0dabe121c3b3c`.
- Fresh beta: `b351bc8530202106ccad432063fd1285cb74da6a` — GO for offline
  method/dataset adequacy only.
- Live model/provider run: absent by design.
- CDR receipt/effectiveness claim: absent and unauthorized.
- Historical `prolog-memory-eval-v0`: unchanged, `REVISE`.

The current deterministic check is a bounded symbolic-core fixture validation,
not evidence that a model answers better with Prolog proofs. The deterministic
12-case slot assembly proves only byte-accounting equality under its declared
offline abstraction, not live provider-token equality, model effectiveness or
a receipt. R2 binds the canonical `case_id -> slot_bytes` map under
`trusted-proof-evidence-slots-v1`; the dataset-derived map, registration
self-hash, method binding and manifest binding must match before a pair can
validate. CDS #28 is now unblocked for its no-live preflight implementation;
the eventual human-operated live run still needs measured provider equality
and a fresh CDR beta before any effectiveness conclusion.

Issue #32 adds only local deterministic receipt-intake preparation. Its
synthetic non-result fixture validates shape and rejection paths, not a live
artifact, aggregate, receipt, or effectiveness claim. Human operation retains
raw outputs locally; a fresh beta must audit a complete candidate. State above
is unchanged.

Issue #32 R1 repairs the P1 proof binding with the versioned immutable
`trusted-proof-digest-registry-v1.json`. It self-hashes and binds the pinned
source snapshot and dataset; every case digest is recomputed from the canonical
trusted-query result. The local stdlib-only intake now binds that registry in
the envelope, requires P0 `null`, and rejects a well-formed P1 digest unless it
equals its case's digest. This is still preparation only: no provider/model
call, raw live output, aggregate, receipt, or effectiveness claim exists.

Issue #35 adds offline-only v2 actual assembled-prompt binding preparation.
It preserves v1 without reinterpretation, self-hashes and locally recomputes
the P0/P1 digest registry, and requires a candidate's raw-root prompt artifact
to match the exact case/condition digest. No provider/model call, raw live
artifact, aggregation, receipt, or effectiveness claim exists.
