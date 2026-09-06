# Gamma R5: switch the trusted-proof collector from receipt v3 to v4

CDR PR #43 now supplies `receipt-intake-v4` and its sampling-aware wire
registry, bound to the PR #41 answering transport. The collector remains
deliberately v3-labelled and must fail closed under the new source pin. This
small CDD change consumes the finished v4 contract; it must not modify it.

## Required alpha change

- Replace v3 validator/registry references, schema version, receipt registry
  field/path and local status wording in `trusted-proof-live-candidate` with
  their v4 equivalents.
- Preserve the existing exact config validation, including canonical sampling
  `{ temperature, top_p }`, no-wrapper sealed prompt source, per-attempt local
  artifacts, all P0/P1/equal-E/accepted-decision/no-partial-receipt gates and
  default zero-call CLI.
- Update fake collector tests/config to demonstrate a 24-record candidate
  validates through CDR v4, while v3 is never emitted. Test sampling is copied
  unchanged into fake transport request.
- No `.cdr/**`, transport implementation/source, provider/model call,
  credential, raw live output, aggregate/effectiveness claim, policy/data/
  oracle/threshold/v0 change. The only new output label is integrity candidate
  v4, not a result.

## Fresh beta exit

Fresh β reproduces v4 validation, checks the receipt is v4-only and independently
breaks sampling, E, decision, proof and default gates. GO closes #34
implementation readiness only; a human run and new CDR beta remain separate.
