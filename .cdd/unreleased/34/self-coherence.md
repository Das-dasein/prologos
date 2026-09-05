# Cycle 34 self-coherence — OpenAI answering transport

## Scope

`trusted-proof-answering.js` is a narrowly scoped, opt-in adapter factory for
sealed assemblies from `trusted-proof-preflight.js`.  It has no default
provider path and `node trusted-proof-answering.js` reports
`offline-no-default-provider` without importing an SDK, constructing a client,
or requesting a provider.  The test suite injects fake clients only.

## Invariants

- The only accepted provider selector is literal `openai-api`; a real-capable
  factory additionally requires `--allow-live-provider`, a complete immutable
  config, matching config/CLI model, and a fresh absolute raw-output directory.
  All of those gates run before the answer provider is created; the SDK itself
  is required only in the default client factory on the first `complete` call.
- The wire constants are runtime SHA-256 values of exactly
  `{{assembled_prompt}}` and `none`. The immutable config must match both.
  Sampling is an exact canonical object with only finite numeric
  `temperature` in `[0, 2]` and `top_p` in `[0, 1]`, the supported OpenAI
  Responses ranges; `seed`, missing fields, extra fields, non-numbers, and
  out-of-range values fail before any SDK/client construction or local root.
  The provider call is exactly
  `{ model, input: assembled.prompt, temperature, top_p }`: no system
  instruction, wrapper, transformed prompt, default sampling, or unsupported
  sampling control is added.
- `executeWithInjectedProvider` remains the mandatory sealed-assembly and
  leakage sentinel before transport/client use.  A reconstructed leaked
  assembly cannot construct or call a client.
- Provider model must equal the configured model. Native usage fields must be
  safe integral values that reconcile; effective context budget `E` is copied
  from native `input_tokens`, never config. Existing P0/P1 rejection remains
  the before-scoring equality boundary.
- A fresh local directory contains exclusive submitted-prompt, raw-response
  and metadata files. Metadata names the provider/model, hashes and usage, and
  explicitly declares `cdr_status: not-a-cdr-receipt-v2`.

## Evidence

`npm run test:trusted-proof-answering` passes with fake-only checks for gate
ordering, exact byte and sampling forwarding, invalid sampling before a client
or evidence root, model mismatch, malformed usage, measured E, P0/P1 mismatch,
local non-overwrite artifacts and leakage before client. The former fake
24-record collector path now correctly fails before root/client construction
because its CDR v3 transport source hash is pinned to the old bytes.

## Deliberate debt

This is not a CDR receipt, effect result, credential check, or provider run.
The transport source changed to bind sampling, so the current CDR v3 source
registration is deliberately stale and this output is **CDR re-registration
required**, not v3-valid or live-ready. A separate CDR re-registration must
pin the new source bytes and receive fresh CDR β review before any human
opt-in run can be treated as CDR evidence.
