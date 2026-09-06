# CDR beta review: native usage receipt integrity v6

Reviewed alpha commit `10df1568bcad96f68615c20c3a619c1a21fa496f` against gamma scaffold `f71010b36f7d66a05e05af2fb124a3f620971b40`.

## Decision

**GO for the bounded v6 local-intake repair.** It is a forward-only validator
and registry identity; it neither invokes a provider nor changes provider,
preflight, or answering runtime.

## Independent evidence

- `node .cdr/waves/cognitive-proof-eval-v1/validate-receipt-intake-v6.js --self-test`
  exited 0 with `receipt-intake-v6-self-test-ok` (about 32 seconds).
- V6 registry rebuilt exactly from its sealed v5 authority.
- Direct mutated fixtures were all rejected: missing and extra
  `provider_usage` keys, negative, fractional, `NaN`, string/non-integer, and
  unsafe values, total mismatch, and `E != input_tokens`.
- Inherited v5 self-test passed, including sealed wire/prompt binding,
  trusted-proof/artifact checks, consumer-source exclusion, and pre-call leak
  boundary coverage. V6 rejects v1 through v5 schema identifiers.
- `npm test` exited 0.
- Diff inspection confirms no changes under `providers/`,
  `trusted-proof-preflight.js`, or `trusted-proof-answering.js`; the v6 path
  has no provider call.

## Runtime note

The long v6 self-test is inherited work: v5 alone took about 15 seconds and
v6 about 32 seconds because it invokes v5 coverage. This is deterministic
local file/Prolog validation, not provider activity. A standalone v3 historical
self-test currently fails because its older pinned `providers/openai-answering.js`
hash no longer matches the repository. That failure predates this alpha diff;
v6 deliberately inherits v5, which passes, and does not restore v3 execution.

No collection, aggregation, effectiveness result, provider invocation, or merge
was performed by this review.
