# CDR beta review: issue #63 Codex diagnostic covariates v9

Reviewed alpha commit `55d27af89b668feb29e1d7f10134f859b7fa6391`
against `gamma-codex-diagnostic-covariates-v9.md` in a fresh beta session.

## Verdict

**GO_PREPARATION.**  The new v9 path is a fake-only, bounded diagnostic
collector.  It does not authorize a real Codex invocation, an effectiveness
claim, a CDR receipt, padding calibration, or aggregation.  A later raw
diagnostic artifact still requires a fresh CDR review.

## Independent findings

- The committed `orderMap()` is exact: all 12 immutable case IDs occur once;
  six map to `P0,P1` and six to `P1,P0`.  The validator pins the whole map,
  requires both conditions per case, their matching ordinals, unique record
  IDs, and exactly 24 records.
- Token inequality is deliberately non-fatal.  A beta fake run with P0/P1
  input totals of 100/71 retained all 24 records and returned only
  `not-equal-budget-not-a-result`; no cache-adjusted total or effect test is
  constructed.
- Each record retains condition order and ordinal, native input/output/total
  counters, nullable cache and cache-write counters, prompt digest, and three
  raw local artifact references.  The validator checks local raw bytes when
  given the collection root.
- The beta mutation sweep rejected tampered raw stdout, a removed record,
  changed committed order map or record order, a negative cache-write count,
  an effectiveness status, and a receipt artifact kind.  It accepted unequal
  input counters only with the fixed diagnostic status.
- Collection requires the injected provider name `fake-codex-diagnostic` and
  injected attempt function.  The module contains no executable, SDK,
  credential, or live-provider path; no real Codex call was made in this
  review.
- The exact alpha diff adds v9 files and package scripts only.  The v8 intake
  validator/schema are byte-for-byte unchanged.

## Verification

- `npm run test:trusted-proof-codex-diagnostic:v9`
- `npm run test:codex-diagnostic:v9`
- `npm run test:cdr-receipt-intake:v8`
- independent fake-only mutation sweep for raw provenance, cardinality,
  committed order, cache counter, status, and artifact kind
- `npm test`
- `git diff --check 86b5a64..55d27af`
- exact no-change diff for v8 intake validator/schema

All passed.  No `codex exec`, OpenAI call, credential inspection, PR, merge,
or live collection was performed.
