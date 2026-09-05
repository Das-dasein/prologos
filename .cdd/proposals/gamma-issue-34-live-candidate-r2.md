# Gamma R2: operator-run v3 candidate bundle for issue #34

## Current evidence

PR #37 supplies a fake-tested, explicit no-wrapper OpenAI answering transport.
PR #39 re-registers its source/wire identities as receipt v3. There is still
no operator surface that runs the whole pinned P0/P1 matrix and emits a local
v3 candidate receipt. Requiring a human to stitch 24 files by hand would
weaken provenance and make the CDR audit needlessly fragile.

## Required CDD implementation

Add a `trusted-proof-live-candidate` orchestration surface that is offline by
default and uses the existing `prepareOpenAIAnsweringRun` transport for any
real request. It must:

1. Read an immutable config and CDR v3 inputs; require all config hashes and
   source/dataset/slot bindings to equal the v3 registry and wire identities.
   Accept only `openai-api`, explicit `--allow-live-provider`, explicit model
   equal to config, and a fresh absolute operator root before constructing a
   client.
2. Deterministically iterate every registered case in stable order, P0 then
   P1. Build P0/P1 only through sealed `assembleCondition`; P0 makes no
   trusted-query call and P1 makes exactly one. Each attempt receives its own
   fresh private directory beneath the root; reuse/non-overwrite is forbidden.
3. For each response, retain the exact submitted prompt and raw provider
   response using the existing transport, then construct a local
   `cognitive-proof-eval-receipt-intake-v3` candidate record with exact
   snapshot/query/slot/proof/prompt/raw/usage/run fields. Score locally using
   the hidden contract but retain only the opaque contract SHA and decision,
   never the hidden contract itself. Do not aggregate or make an effectiveness
   claim.
4. Before the receipt is emitted, require every P0/P1 pair to have identical
   measured `effective_context_budget`, identical immutable pair binding and
   no rejected/unavailable case. A partial run leaves only local raw evidence
   and exits nonzero; it cannot emit a candidate receipt.
5. Emit a single exclusive `candidate-receipt-v3.json` in the fresh root and
   immediately run the existing CDR v3 validator against it with that root.
   The validator's successful integrity status is reported, not converted into
   an effectiveness result.

## Fake-only proof requirements

Tests may inject the client/transport but never use a key or network. They
must prove the full 24-record bundle validates through CDR v3; exact 24
calls/12 P0/12 P1; no client on every bad gate/default CLI; deterministic
case order; prompt/raw paths unique and local; P0/P1 E mismatch gives no
receipt; provider model/usage/leak/trusted proof failure leaves no receipt;
and raw root cannot be pre-existing. Do not change `.cdr/**` or the source
files whose hashes CDR v3 pins. Add CDD alpha report/self-coherence with the
operator command and disclosure that no live call happened.

## β exit

Fresh β replays the fake 24-record bundle from a clean install, passes its
receipt to the CDR v3 validator, and independently exercises the no-receipt
negative paths. GO means only an executable human-run collection mechanism;
the later run and fresh CDR β decide evidence.
