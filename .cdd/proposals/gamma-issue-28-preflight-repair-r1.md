# Gamma repair R1: actual oracle leakage and retry identity

Issue: #28  
Input: fresh beta `REVISE` of alpha target
`6430f9866961356262db2592eaaff18609ace75e`.

## Accepted findings

1. The leak sentinel detects only literal field names, so an actual
`hidden_answer_contract.allowed` string appended to P0 reaches the injected
provider. This violates the required no-oracle-leak-before-call boundary.
2. `retry_policy` is absent from required immutable configuration and equality
digest. Conditions that differ in retries could compare as equal.

## Repair contract

- Derive per-case forbidden oracle values from the loaded immutable fixture,
  not only field names. Reject their appearance before provider call. For P1,
  a value that occurs *inside the declared evidence slot* is allowed only as
  part of the exact trusted `runTrustedQuery` serialization; the same value
  outside the slot is a leak. P0 has no such exception.
- Require canonical non-empty retry policy in `requireImmutableConfig` and
  bind it in every equality digest/artifact. Missing, changed, or mismatched
  retry policy rejects before scoring.
- Add actual hostile tests for the raw allowed-answer string, P1 outside-slot
  injection, missing retry policy and changed-retry digest. Preserve fake-only
  execution and every existing no-live constraint.

## Fresh alpha dispatch

```text
Role: fresh CDD alpha repair R1 for #28 on cycle/28.
Read the beta RC, gamma scaffold and this repair. Implement only actual oracle
value leak protection and retry-policy identity. Do not call/introduce a
provider or weaken P1's allowed trusted evidence-slot semantics. Run focused,
full and diff checks; commit/push alpha-only work. No CDR artifact/receipt,
merge or issue close.
```
