# Beta review R7: issue #34 candidate receipt v6 switch — RC

Fresh independent CDD beta reviewed immutable alpha target
`55615ca5663de5a46c0a69972f71f97a867c551d` against gamma v6 authority
`3ad3dffe4ad2ab6d49a78917793f38d64c8463de`.

## Verdict

**RC for the requested collector-level native-usage boundary.** The v6
consumer emits and validates the 24-record fake candidate with reconciled
native counters and `E == input_tokens`; receipt-level v6 validation rejects
negative, missing, extra, non-reconciling-total, and E mutations. However,
an extra nested field in the provider's own `response.usage` is silently
discarded by `nativeUsage()` before the receipt is constructed. Collection
therefore emits a valid v6 receipt for that malformed provider usage object,
contrary to R7's requested exact native-usage/no-emission coverage. No merge
decision is made here.

## Independent evidence

- Clean `npm ci`, `npm test`, `npm run test:trusted-proof-live-candidate`,
  `npm run test:trusted-proof-preflight`, `npm run test:trusted-proof-answering`,
  `npm run test:cdr-receipt-intake:v6`, and `git diff --check` passed.
- An independent fake 24-call P0/P1 collection returned v6 status
  `candidate-integrity-valid-not-a-result-v6`; all records contain native
  `input_tokens`, `output_tokens`, `total_tokens`, reconcile total, and use
  `E == input_tokens`. The v6 validator rejected post-collection mutations
  of nested usage: negative input, missing total, extra nested key,
  mismatched total, and E mismatch.
- At collection time, negative input, missing total, and mismatched total
  fail response validation and emit no `candidate-receipt-v6.json`. In
  contrast, a fake response usage
  `{input_tokens:1, output_tokens:1, total_tokens:2, extra:0}` completes all
  24 calls and emits the v6 receipt: `providers/openai-answering.js` reads
  only the three recognized fields and does not require exact keys.
- Prior sampling, exact-wire, proof, scorer-decision, fresh-root, provider
  model, sealed-prompt and offline-default gates remain covered by the green
  preflight/answering/collector suites. The three default CLIs report zero
  provider calls.

## Scope/boundary

The alpha diff changes no `.cdr/**` file and this beta receipt adds only this
CDD review. No provider, credential, network call, live data, transport or
CDR action occurred. Repair needs a narrowly scoped CDD change that makes
provider-native usage shape exact before receipt emission, plus a fresh beta
review.
