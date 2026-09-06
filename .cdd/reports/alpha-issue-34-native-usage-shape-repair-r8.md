# Alpha R8: exact native OpenAI Responses usage shape

This repair applies gamma R8
`a9e9d2b6fb292188d0daff8851ccf981e505ebe2` before any local final metadata
or candidate receipt can be written. `nativeUsage()` now accepts only the
installed OpenAI SDK 7.9.0 `ResponseUsage` top-level keys:
`input_tokens`, `input_tokens_details`, `output_tokens`,
`output_tokens_details`, and `total_tokens`. The three headline counters are
required non-negative safe integers and must reconcile. If supplied, the
input-details object must be exactly `{ cache_write_tokens, cached_tokens }`
and the output-details object exactly `{ reasoning_tokens }`; every detail
counter is likewise a non-negative safe integer. Both detail objects remain
optional to support a provider response that omits them.

The canonical local projection remains deliberately limited to
`input_tokens`, `output_tokens`, `total_tokens`, and
`effective_context_budget = input_tokens`; native detail counters stay only in
the raw local response. Fake-only answering tests now prove a realistic
SDK-shaped usage reply is accepted and projected this way, while an arbitrary
top-level key, unknown detail key, incomplete detail object, and negative
detail counter each reject before `metadata.json` exists.

## Evidence

- `npm run test:trusted-proof-answering`: pass (fake clients only).
- `npm test`: pass.
- `git diff --check`: pass.
- `npm run test:trusted-proof-live-candidate`: deliberately fails before fake
  collection because CDR v6's pinned transport-source digest no longer matches
  `providers/openai-answering.js`.

## Boundary and debt

No `.cdr/**` material, provider call, credential, or live artifact was
created. The changed transport bytes make the existing receipt-v6 source
registration stale. This implementation is therefore **CDR
re-registration-required**, not receipt-v6-valid, live-ready, or an effect
claim. A separately authorized CDR re-registration must pin these source
bytes and receive fresh CDR review before a v6 candidate collection can be
treated as CDR evidence.
