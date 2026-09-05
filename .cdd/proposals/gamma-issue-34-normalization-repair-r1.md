# Gamma repair R1: fail closed on model identity and negative native usage

Fresh CDD beta reproduced two normalization fail-opens at alpha target
`fa895545132211c6f41aac70e67a33ebdbceae7a`:

1. a missing/falsy `response.model` satisfies the current conditional model
   mismatch check; and
2. `nativeUsage` checks safe integers and reconciliation but not non-negativity.

Both fields are provider evidence and must fail closed before any local
artifact can be written or equality can be considered.

## Required alpha R1 changes

- Require `response.model` to be non-empty text and exactly equal to the
  immutable selected model. Omission, whitespace and mismatch are distinct
  failures with no artifact output.
- Require all native usage counters to be safe integers greater than or equal
  to zero, then retain exact `total = input + output` reconciliation.
- Add focused fake-only tests for absent/empty model and negative input,
  output and total counters. Assert no final local response metadata exists on
  failure. Preserve the existing model-mismatch and malformed-total tests.
- Do not alter CDR files, create a live receipt, invoke a provider or change
  the later CDR-v3 re-registration debt.

Fresh beta must independently exercise every repair case after a clean install.
