# Gamma repair R2: seal trusted P1 assembly before transport

Issue: #28  
Input: beta R1 RC `68ee7e162fdb5a5502eb8112b78b9db45e9589fa`.

## Finding

`executeWithInjectedProvider` accepts caller-owned mutable assembly fields. A
caller can replace both P1 prompt slot and `pair.p1Slot` with padded hidden
answer text, passing the local consistency check and reaching transport. The
transport must not treat a caller's matching metadata as proof that the slot
came from `runTrustedQuery`.

## Repair contract

- `assembleCondition` produces a deeply immutable sealed assembly with a
  module-private provenance marker; transport rejects unsealed/reconstructed
  objects before provider call.
- For P1/PX, transport recomputes/compares the slot against the exact trusted
  serialization derived during assembly, including declared padding. P0 must
  retain exact neutral control content.
- Tests must attempt nested-object mutation and a reconstructed lookalike with
  forged hidden answer, asserting rejection and zero transport calls. Preserve
  the legitimate P1 trusted slot path, actual oracle-value leak guard, retry
  binding and all fake-only/no-live conditions.

This is an internal harness provenance boundary, not a claim that arbitrary
same-process hostile JavaScript is a security sandbox. Candidate Prolog remains
outside this process; no provider is invoked by alpha/beta.

## Fresh alpha dispatch

```text
Role: fresh CDD alpha repair R2 for #28 on cycle/28.
Read beta R1 and this artifact. Implement sealed deeply immutable assembly and
transport-side exact P1/PX slot provenance check; add mutation/lookalike zero-
call tests. Preserve all prior gates and no-live boundary. Focused/full/diff,
alpha-only commit/push; no CDR work, provider, merge or close.
```
