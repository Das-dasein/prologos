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
  `{{assembled_prompt}}` and `none`.  The immutable config must match both.
  The provider call is exactly `{ model, input: assembled.prompt }`: no system
  instruction, wrapper, or transformed prompt is added.
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
ordering, exact byte forwarding, model mismatch, malformed usage, measured E,
P0/P1 mismatch, local non-overwrite artifacts and leakage before client.
`npm run test:trusted-proof-preflight`, default CLI execution, and
`git diff --check` also pass in this α worktree.

## Deliberate debt

This is not a CDR receipt, effect result, credential check, or provider run.
The published CDR v2 receipt intake has synthetic template identities and
cannot honestly bind this real wire contract. A separately authorized CDR-v3
re-registration must establish the actual template identities and fresh CDR β
review before any human opt-in run can be treated as CDR evidence.
