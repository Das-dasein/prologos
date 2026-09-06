# Beta review R9: receipt v7 collector switch — GO (CDD), RC (live/CDR)

Fresh independent CDD beta reviewed alpha target
`b81ae16b1187d7c2b87a3de64d5a124cc3a64753` against the preceding gamma
switch `2b6a1bf85b68f15f288bb713ea445282f73e1c9c`.

## Verdict

**GO for the scoped CDD collector switch.** The collector now binds its
immutable configuration and emitted candidate receipt directly to the v7
authority registry. Its fake-only happy path performs all 24 ordered P0/P1
attempts (12 cases), accepts the installed OpenAI Responses detail-shaped
usage object, produces exactly 24 accepted records, preserves headline native
counters only, reconciles `total_tokens`, and sets `E` to `input_tokens`.

**RC for live/CDR completion.** This review did not run a provider, select a
model, use credentials, create a live root or candidate receipt, or make an
effect/result claim. A user-operated collection and the separately required
fresh CDR review remain necessary.

## Independent evidence

- `node trusted-proof-live-candidate.js` returned
  `offline-no-default-provider` with `provider_calls: 0`.
- `node test-trusted-proof-live-candidate.js` passed. Its full fake 24-call
  v7 collection uses `input_tokens_details` and `output_tokens_details`; it
  rejects each malformed or extra detail variant, unreconciled usage, missing
  P1 proof provenance, rejected local decision, unequal paired E, bad config
  or model/live gate, and an existing root. Every failure asserts that no
  `candidate-receipt-v7.json` is written.
- `node .cdr/waves/cognitive-proof-eval-v1/validate-receipt-intake-v7.js
  --self-test` passed.
- `npm test` passed, including preflight and answering transport gates.
- `git diff --check 2b6a1bf..b81ae16` passed. The alpha diff changes only the
  collector, its v7 config, fake-only collector test, and alpha report;
  `.cdr/**`, `providers/openai-answering.js`, and
  `trusted-proof-answering.js` are unchanged.

## Boundary

This beta commit records only this decision. The candidate is an integrity
artifact path, not evidence of model performance or a completed CDR action.
No network/provider call, credential access, live artifact, or CDR transport
edit occurred during review.
