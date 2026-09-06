# Beta review R8: native OpenAI Responses usage shape — GO (CDD), RC (v6/CDR)

Fresh independent CDD beta reviewed immutable alpha target
`54b7086eb383f170c3fe2c2c435fb77b029afcd7` against gamma R8 authority
`a9e9d2b6fb292188d0daff8851ccf981e505ebe2`.

## Verdict

**GO for the narrowly scoped CDD evidence-normalization repair.**
`nativeUsage()` now accepts the actual installed `openai` 7.9.0 Responses
`ResponseUsage` shape, preserves only its audited headline projection, and
fails closed before final local metadata for an unknown top-level usage field
or malformed detail object. The prior model identity, sealed-wire, sampling,
native-counter reconciliation, fresh-root, and no-live-default gates remain
green.

**RC for receipt-v6/CDR or live collection.** This source change intentionally
makes the pre-existing v6 transport-source registration stale. Both the fake
candidate test and the v6 intake self-test fail closed at
`providers/openai-answering.js does not match pinned transport source`, before
collection or receipt creation. A separately authorized CDR re-registration
and fresh CDR review are required; this review does not make v6 live-ready.

## Independent evidence

- Installed `openai` 7.9.0 declarations define `ResponseUsage` with required
  `input_tokens`, `input_tokens_details {cache_write_tokens, cached_tokens}`,
  `output_tokens`, `output_tokens_details {reasoning_tokens}`, and
  `total_tokens`. A fake response with precisely that shape was accepted and
  canonically projected to the three headline counters plus
  `effective_context_budget = input_tokens`.
- Independent direct probes rejected missing fields within a supplied detail
  object, extra detail fields, string or fractional detail counters, and
  negative detail counters. The answerer suite also proves unknown top-level
  usage, unknown detail, missing detail member, and negative detail rejection
  before `metadata.json` exists.
- `npm run test:trusted-proof-answering`, `npm test`, and
  `npm run test:trusted-proof-preflight` passed; `git diff --check` passed.
- `npm run test:trusted-proof-live-candidate` and
  `npm run test:cdr-receipt-intake:v6` both deliberately fail at the stale
  v6 source pin. `node trusted-proof-live-candidate.js` was checked only in
  its no-gates mode and reports `offline-no-default-provider` with zero
  provider calls.

## Scope and boundary

The alpha target changes only the answering transport, its fake-only test,
and its CDD report. This beta commit adds this CDD review only. No `.cdr/**`
material was modified; no credential, provider/model, network, live
collection, raw live output, candidate receipt, CDR action, or effectiveness
claim occurred.
