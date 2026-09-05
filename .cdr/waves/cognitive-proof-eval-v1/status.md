# Wave status: cognitive-proof-eval-v1

- State: `ALPHA_REPAIR_READY_FOR_FRESH_BETA`
- Alpha immutable-slot-binding repair: prepared on `cdr/29`; fresh β must
  reproduce the registration hash and every negative binding proof.
- Earlier alpha material: `756ad31dc7dbbf28f1eab0e2f7f0dabe121c3b3c`.
- Fresh beta: `b351bc8530202106ccad432063fd1285cb74da6a` — GO for offline
  method/dataset adequacy only.
- Live model/provider run: absent by design.
- CDR receipt/effectiveness claim: absent and unauthorized.
- Historical `prolog-memory-eval-v0`: unchanged, `REVISE`.

The current deterministic check is a bounded symbolic-core fixture validation,
not evidence that a model answers better with Prolog proofs. Gamma identified a
prospective method gap after the first beta: P1 appends a proof but the method
also requires exact measured equal context budget `E`; without a declared
equal-length control/proof slot this is not executable. CDS issue #28 is held
until issue #29 repairs and fresh CDR beta re-audits that contract. The repair
now has a deterministic 12-case offline slot assembly/validator; it proves
only byte-accounting equality under its declared offline abstraction, not live
provider token equality, model effectiveness, a receipt, or a CDS preflight.
R2 additionally binds the canonical `case_id -> slot_bytes` map under
`trusted-proof-evidence-slots-v1`; the dataset-derived map, registration
self-hash, method binding, and manifest binding must match before a pair can
validate. CDS #28 remains blocked pending a fresh independent CDR β review.
