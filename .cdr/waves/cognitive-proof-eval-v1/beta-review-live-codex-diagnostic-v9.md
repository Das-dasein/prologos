# CDR beta review: issue #65 live Codex diagnostic v9 transport

Reviewed alpha commit `9db4c1cc8a8983b9ecf063d6124e08c211bbec23`
against `gamma-live-codex-diagnostic-v9.md` in a fresh beta session.

## Verdict

**GO_PREPARATION.**  The new entrypoint is a deliberately gated, literal
`codex exec` transport for the already diagnostic-only v9 artifact.  It does
not create a score, an effect estimate, an equal-budget condition, padding,
cache-adjusted arithmetic, retry, or an effectiveness receipt.  A future
user-authorized live run remains diagnostic-only and its raw output needs a
fresh CDR audit before any interpretation.

## Independent findings

- Every gate is checked before the collector can construct the v8 answering
  transport and therefore before its only `spawn` call: explicit
  `codex-exec`, `--allow-live-provider`, an absolute readable config,
  config/model equality, and a fresh absolute root.  The adapter delegates to
  the pinned v8 Codex wire; no SDK, API key, credential fallback, command
  override, or non-literal executable path is added.
- A successful record binds raw submitted prompt plus Codex stdout, stderr,
  and final-output files by local reference and SHA-256.  Native input/output
  counters are parsed from the sole `turn.completed` JSONL event; optional
  cache and cache-write counters are retained without adjustment.
- The validator still pins exactly the immutable 12-case order map: six
  `P0,P1`, six `P1,P0`, and 24 total P0/P1 records.  It requires both records
  per case and order ordinal consistency.  The sole artifact state is exactly
  `diagnostic_candidate` with `not-equal-budget-not-a-result`.
- Independent fake-transport mutations rejected missing live permission,
  wrong provider, model mismatch, and an already-existing root with zero
  spawned calls.  A separate generated artifact then rejected changed status,
  removed record, changed order map, tampered raw digest, and negative cache
  count.
- The alpha change affects the separate live-v9 entrypoint, its template
  config/test, package script, and the v9 validator's explicit allowance for
  the now-live `codex-exec` provider.  v8 transport and receipt behavior are
  unchanged; its regression test passed.

## Verification

- `npm run test:trusted-proof-codex-diagnostic-live:v9`
- `npm run test:trusted-proof-codex-diagnostic:v9`
- `npm run test:trusted-proof-codex-exec-live-candidate`
- `npm run test:codex-diagnostic:v9`
- `npm test`
- independent fake-only gate and mutation sweeps for provider permission,
  model, fresh root, status, cardinality, order, raw digest, and cache count
- `git diff --check`

All passed.  No real `codex exec`, OpenAI request, credential inspection, PR,
or merge was performed during this beta review.
