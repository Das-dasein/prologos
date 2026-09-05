# Gamma scaffold: explicit OpenAI answering transport (issue #34)

## Why this CDD slice exists

The trusted-proof harness and CDR local receipt gates are deliberately
no-live. The repository already has an `openai-api` extraction transport, but
not an answering transport that can send the sealed P0/P1 prompt and return
provider-native usage/raw evidence. This slice introduces that transport only;
it must not call it.

While preparing this slice, gamma found that CDR receipt-v2 currently carries
synthetic `aa…`/`bb…` template identities. They are not an honest identity for
a real wire payload. **Alpha must not force live records through receipt-v2 or
claim it is live-ready.** This CDD slice publishes stable wire identities for a
later CDR re-registration.

## Wire contract

The provider receives the sealed `assembled.prompt` byte-for-byte as `input`.
There is no hidden system instruction or adapter wrapper.

- base input template text is exactly `{{assembled_prompt}}`;
- wrapper template text is exactly `none`;
- their SHA-256 values are exported constants, calculated at runtime from
  those literal strings, and an immutable live config must match them;
- model, sampling and retry policy remain pinned by the caller; the adapter
  must return the selected model or fail.

The provider-native response is normalized to `{ answer, raw, usage }`, where
`input_tokens`, `output_tokens` and `total_tokens` are native integral values
that reconcile; `effective_context_budget` is the provider-measured input
token count. It is never copied from config, rounded, padded, or fabricated.
An unequal P0/P1 input measurement therefore fails before scoring by the
existing harness.

## Required implementation

1. Add a lazily loaded `openai-api` answering provider using the installed
   official SDK, injectable client factory for tests, and no network/import
   until all live CLI gates succeed.
2. Add a narrowly scoped live-run orchestration surface or exported adapter
   factory that consumes only sealed assembly objects from
   `trusted-proof-preflight.js`, enforces the wire-template hashes, writes
   raw response and submitted prompt only to a new local non-overwriting
   directory, and records enough local metadata for the *future* CDR v3
   intake. It must label output `not-a-cdr-receipt-v2` until that rebind exists.
3. Default execution must produce no network request. Reaching a real client
   requires fixed provider `openai-api`, `--allow-live-provider`, complete
   immutable JSON config, explicit model, and a fresh absolute raw-output
   directory, all checked before SDK/client construction.
4. Fake-only tests cover gate ordering (client counter stays zero), exact
   input forwarding, model mismatch, malformed/nonreconciling usage, measured
   `E` provenance, response/prompt raw non-overwrite, P0/P1 mismatch rejection,
   leakage rejection before client, and no-default-live path.
5. Self-coherence names the CDR-v3 re-registration dependency. Do not modify
   `.cdr/**`, CDR policy/dataset/oracle/thresholds, historical v0, or issue
   closure state.

## Non-goals

No credential, endpoint, provider/model invocation, real raw output,
effectiveness result, CDR receipt, or automatic retry. This is not permission
to call `responses.create`.

## CDD beta exit

Fresh beta must reproduce fake-only tests and inspect import/client timing,
wire bytes, native usage mapping, local artifact safety and all gates. A GO
means only that the adapter is ready for later CDR re-registration and a human
opt-in run; it is not evidence about the model.
