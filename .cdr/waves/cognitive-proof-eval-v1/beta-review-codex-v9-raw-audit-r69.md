# Beta CDR raw-evidence audit — issue #69, Codex diagnostic v9

## Verdict

`GO — diagnostic-valid-not-a-result`.

This is a validation of one immutable local diagnostic artifact, not an
effectiveness result, CDR receipt, causal claim, or model comparison.

## Evidence independently checked

- Raw root:
  `/Users/artem/Documents/prologos-live/codex-v9-run-20260906-134714`
- Artifact SHA-256:
  `3ca3314446c13af468237d5f5641ab2915aa3a4e638f47c800ab658bbcef0212`
- Re-running `validate-codex-diagnostic-v9.js` with that raw root returned
  `not-equal-budget-not-a-result` for 24 records.
- The artifact binds one explicit model, `gpt-5.6-terra`, consistently in the
  run and config, and binds the registered `codex exec` wire command.
- It contains 12 cases and exactly 24 distinct P0/P1 records: 12 P0 and 12
  P1. The committed order map is counterbalanced: six P0-first and six
  P1-first cases.
- Every local prompt, stdout, stderr, and final-output reference exists under
  the audited root and matches its recorded SHA-256. The 24 final-output files
  each parse as an object with the constrained `answer` string field; captured
  stdout contains the expected Codex JSONL lifecycle, including 24
  `turn.completed` events.
- Each record has native input/output/total counters plus non-negative native
  cache and cache-write counters. Observed input tokens range from 19,374 to
  187,176 and output tokens from 95 to 1,208; all 24 records carry an explicit
  cached-input and cache-write value. These values are retained as covariates,
  not adjusted or compared as a score.

## Mutation checks

On independent in-memory/copy mutations, the validator rejected:

- a non-diagnostic status;
- a missing record;
- an invalid order ordinal;
- a negative cached-input counter; and
- a byte-modified raw stdout file.

Focused v9 tests, the legacy Codex v8 test, the full `npm test`, and
`git diff --check` passed. No provider was invoked, no raw artifact was
modified, and no dashboard was used as evidence.

## Boundary

The artifact intentionally remains `not-equal-budget-not-a-result`: P0/P1
input budgets and cache behavior differ. It establishes a preserved,
auditable diagnostic trace only. It does not establish that supplying the
Prolog proof improved, worsened, or caused any response characteristic.
