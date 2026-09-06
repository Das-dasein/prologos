# Gamma CDR scaffold — issue #56: Codex exec receipt intake v8

## Purpose

`codex-exec` was added as a separate CDD transport in #54.  It is not covered
by OpenAI v7 authority: v7's hashes, native-usage semantics and collector are
intentionally OpenAI-specific.  This wave creates a separate, forward-only
Codex v8 preparation path.  It makes no live invocation and no result claim.

## Alpha scope

1. Create an immutable, self-hashing v8 wire-authority registry that pins only
   the executable Codex transport sources (`providers/codex-exec-answering.js`
   and `trusted-proof-answering.js`), their exact source hashes, the final
   output schema identity, command semantics (`exec`, ephemeral, read-only,
   JSONL, explicit model/schema/final-output capture), dataset/slot/proof
   bindings, and P0/P1 assembled prompt digests.
2. Create v8 receipt schema/validator and a synthetic non-result fixture.  It
   must reject every predecessor format, source/schema/command/usage/artifact/
   prompt/proof/slot/E/provider/config mutation.  Native usage is exactly the
   Codex completed-event projection: non-negative integral `input_tokens` and
   `output_tokens`; optional reported total must reconcile; canonical receipt
   stores their sum and `E=input_tokens`.
3. Add an explicit `codex-exec` collector/config v8, leaving all v7 files and
   OpenAI collector behavior unchanged.  The collector must require the live
   gate, explicit Codex provider/model/config, a fresh absolute root, and
   `config.provider === codex-exec`; it calls no default provider.  It emits a
   candidate receipt only after all 24 P0/P1 records pass exact v8 intake and
   local scorer decisions.
4. Add offline fake-spawn tests that prove no Codex process runs unless every
   gate is satisfied, and that invalid/mutated usage/schema/command/proof/E
   produces no candidate receipt.

## Hard boundaries

Do not invoke `codex exec`; do not read or manipulate Codex credentials; do
not edit OpenAI v7 transport/collector/config/registry/intake, dataset, query,
Prolog logic, scorer, or claim any effectiveness result. `GO_PREPARATION` is
not permission to interpret a future run; fresh CDR beta must review a real
artifact separately.
