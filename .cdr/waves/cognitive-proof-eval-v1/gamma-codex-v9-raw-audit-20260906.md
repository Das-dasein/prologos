# Gamma CDR scaffold — issue #69: raw audit of Codex diagnostic v9

## Immutable evidence under audit

- Root: `/Users/artem/Documents/prologos-live/codex-v9-run-20260906-134714`
- Artifact: `diagnostic-candidate-v9.json`
- SHA-256: `3ca3314446c13af468237d5f5641ab2915aa3a4e638f47c800ab658bbcef0212`
- Claimed collector result: 24 records,
  `diagnostic-collected-not-a-result-v9`.

## Beta scope

Independently reproduce the v9 validator against the raw root. Check all raw
artifact hashes; exactly 12 cases / 24 P0/P1 records; committed 6/6 order map;
model/config/wire bindings; native input/output/cache counters; and constrained
final-output artifacts.

Report only descriptive observations that follow directly from the immutable
artifact. The required terminal classification is diagnostic-only:
`not-equal-budget-not-a-result`.

## Forbidden conclusions/actions

Do not call a P0/P1 difference a Prolog effect, causal result, CDR receipt,
or model comparison. Do not normalize, cache-adjust, rerun, score differently,
or call any provider. The raw root remains local and is not committed.
