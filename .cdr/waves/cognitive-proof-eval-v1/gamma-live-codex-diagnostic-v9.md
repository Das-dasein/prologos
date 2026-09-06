# Gamma CDR scaffold — issue #65: live Codex transport for diagnostic v9

## Decision

Issue #64 sealed only a fake-only diagnostic artifact; it cannot make a
provider call. Add the smallest explicit live adapter that reuses the pinned
`codex exec` wire implementation and changes no interpretation rule.

## Alpha scope

- Add a separate v9 live entrypoint/collector. It must require all of:
  `--provider codex-exec`, `--allow-live-provider`, an absolute config file,
  matching explicit `--model`, and a fresh absolute run root.
- Reuse `providers/codex-exec-answering` and the v8 wire authority for the
  exact command, JSONL parsing, final-output file, raw stdout/stderr, and
  native usage counters. Do not invoke an SDK or an OpenAI API key.
- Produce the existing v9 `diagnostic_candidate` only: 12 cases, 24
  counterbalanced P0/P1 records; retain native input/output/cache fields and
  order. Its sole terminal status remains `not-equal-budget-not-a-result`.
- Extend validation only as needed to authenticate live v9 raw artifacts and
  native usage. It must not add a scorer, aggregate, threshold, equality gate,
  padding, retry, cache-adjusted arithmetic, or effectiveness status.
- Fake-only tests must prove every rejected gate causes zero spawned provider
  calls, and a valid injected transport produces validating v9 evidence.

## Boundaries

No real provider call during alpha/beta/CI. Do not alter v8, v7, the dataset,
Prolog rules, prompt identities, or the committed v9 fake-only collector.
A fresh beta must review both code and mutation boundaries before any
user-authorized live launch.
