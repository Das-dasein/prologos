# Gamma repair R3: prevent candidate emission on rejected scoring decisions

Fresh β reproduced that alpha target `9eba925141927c6b017f49f8f9eb688513ccff4d`
emits `candidate-receipt-v3.json` when all 24 local answers receive scorer
decision `rejected`. Receipt v3 validates integrity, but it intentionally does
not decide experiment eligibility. The collector must enforce the gamma R2
precondition before it turns local attempts into a candidate.

## Required alpha R3 repair

- Before receipt emission, require every collected record's local scorer
  decision to be exactly `accepted` (the canonical success decision). Any
  `rejected`, unknown, absent or malformed decision is an unavailable case.
- On that failure, retain already written local prompt/raw evidence for review,
  return/exit a clear no-receipt error, and prove that
  `candidate-receipt-v3.json` was never written.
- Keep the existing pair E/proof/model/usage/leak failure behavior and no
  output rewriting. Do not change CDR validator/schema/method, score meaning,
  fixture answer contracts, data/oracles/thresholds, pinned transport files,
  or default/network behavior.
- Add fake-only tests with all rejected and one rejected/otherwise accepted
  matrix; both must leave no receipt. Preserve the positive fake matrix with
  all accepted decisions and CDR v3 validation.

Fresh β must independently execute these three matrices. Its verdict remains
about collection safety, not effectiveness.
