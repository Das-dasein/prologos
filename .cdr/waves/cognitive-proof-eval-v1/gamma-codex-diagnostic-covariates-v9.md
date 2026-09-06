# Gamma CDR scaffold — issue #63: minimal Codex diagnostic with covariates

## Decision

Do not calibrate padding and do not call P0/P1 an equal-budget comparison.
Create a bounded diagnostic collector that preserves observed token/cache
differences instead of aborting on them.

## Alpha scope

Create a distinct v9 Codex diagnostic protocol, leaving v8 unchanged.

- Exactly 24 records: two conditions for each of 12 cases, with a committed
  counterbalanced order map: six cases `P0,P1`, six `P1,P0`.  No retries.
- Preserve raw local artifacts and the existing exact prompt/proof/config/
  command/provider/model checks.
- For each record retain native `input_tokens`, `output_tokens`, optional
  `cached_input_tokens` and `cache_write_input_tokens` when supplied, plus
  `condition_order` and ordinal.  Do not invent a cache-adjusted total.
- Unequal P0/P1 `input_tokens` is recorded and does not abort collection.
- A complete local artifact is a `diagnostic_candidate`, never a candidate
  effectiveness receipt: its status must explicitly say
  `not-equal-budget-not-a-result`.
- Fake-only tests must prove order-map completeness/balance, raw/config binding,
  covariate preservation, and that unequal E yields diagnostic output rather
  than a causal/effectiveness status.

## Required interpretation

The future audit may report descriptive P0/P1 answer and token/cache/order
data only. It must not attribute a difference to the trusted proof, apply an
effect threshold, or call a diagnostic artifact a CDR receipt.

## Boundaries

No real Codex execution during preparation; no v8/OpenAI changes, no padding
optimization, no scorer/dataset/Prolog change. Fresh CDR beta must review the
protocol and later the raw diagnostic run.
