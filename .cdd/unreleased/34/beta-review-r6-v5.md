# Beta review R6: issue #34 candidate receipt v5 switch — RC

Fresh independent CDD beta reviewed immutable alpha target
`4c2b4697e2c7f47ac83b0dfced32f5082567cfc8` against gamma v5 authority
`aa3f2244023543cfa5a4ce10082d8c4bcaf75256`.

## Verdict

**RC for the requested receipt-integrity claim.** The v5 consumer switch is
otherwise bounded and the fake collection reaches 24 deterministic records,
but a post-write mutation of `record.usage.provider_usage.input_tokens` is
accepted by the v5 intake path. This is not sufficient to call the resulting
candidate receipt integrity-complete under the requested usage-mutation
check. No merge decision is made here.

## Independent evidence

- Clean `npm ci`, `npm run test:trusted-proof-live-candidate`,
  `npm run test:cdr-receipt-intake:v5`, `npm test`, and `git diff --check`
  passed.
- A separately injected fake client captured all 24 requests. Each was exactly
  `{ model, input, temperature: 0, top_p: 1 }`; no wrapper or extra sampling
  field was forwarded. The receipt has schema/file v5 only, ordered 12 P0/P1
  pairs, and no `candidate-receipt-v3.json`.
- Collection-time E mismatch, rejected decision, provider model mismatch,
  non-reconciling native usage, sealed-prompt leakage, and non-fresh root each
  failed; no v5 or v3 receipt was created in those negative paths. The default
  CLI remains offline with zero provider calls.
- Receipt validation rejected independent post-assembly mutations of P1 proof
  digest, pair E, run model, and an injected oracle/leak field. It did **not**
  reject a mutation of `records[0].usage.provider_usage.input_tokens` from its
  native observed value to `-1`: `validateEnvelope(..., { rawRoot })` resolved
  successfully. The v2 compatibility validator requires the `provider_usage`
  field but does not validate its nested native counters.

## Scope/boundary

The alpha diff changes no `.cdr/**` file and no pinned wire transport source;
it changes only the candidate consumer, its config/test, and CDD report.
No provider, credential, network call, real collection, CDR modification, or
merge occurred during this review. Resolving the RC requires an explicitly
authorized CDR-side receipt schema/validator decision (or a deliberately
narrowed integrity claim), followed by a fresh beta review.
