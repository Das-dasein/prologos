# Cycle 28 self-coherence — trusted-proof preflight harness

## Scope

`trusted-proof-preflight.js` is a no-live harness.  It imports no provider SDK,
has no default transport and does not expose a live invocation path.  Tests use
an injected fake provider and fake usage values only; those values are test
doubles, never provider-token measurements.

## Invariants

- Immutable dataset and slot-registration bindings validate before assembly.
- P0 builds from accepted snapshot/query and an all-`~` registered control
  slot without calling `runTrustedQuery`; P1 calls it exactly once.  PX needs
  an explicitly supplied P1 result and remains exploratory.
- The sentinel derives each immutable fixture's hidden allowed-answer and
  trusted-result serialization, rejects either outside the declared slot before
  the injected transport is called, and gives P0 no exception. P1/PX proof
  content is permitted only as the exact trusted serialization in that slot.
- Equality digests bind source, dataset, registration, snapshot, query, model,
  prompt hashes, sampling, canonical non-empty retry policy, slot size and
  measured `E`. Retry-policy absence or mismatch, P0/P1 unequal `E`, or a
  differing digest rejects before hidden-contract scoring; the retry policy is
  also retained in each result envelope.
- Artifact writes use exclusive creation for both raw and envelope files.
  Envelopes retain prompt/snapshot/query/proof references, fake/live usage,
  equality digest and scorer outcome, but no hidden contract text.
- A live adapter requires an explicit provider, `--allow-live-provider`, and
  complete immutable config.  Its invocation remains unimplemented in alpha.

## Deliberate debt

The actual provider adapter, provider-side tokenizer/usage implementation,
human-operated live run, raw-live review and fresh CDR beta are deferred.  No
test or CLI default calls a provider, and this work creates no CDR receipt or
effectiveness claim.
