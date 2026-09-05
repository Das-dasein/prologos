# Gamma scaffold: bind actual assembled P0/P1 prompts (issue #35)

## Finding and scope

`receipt-intake-v1` presently pins configured base/wrapper hashes in its `run`
object, but a record carries no hash for the concrete prompt submitted to the
provider. The intake can therefore validate a receipt whose raw response was
created from a different prompt. This is an integrity gap, not an observed
model result.

This CDR repair remains offline. It must add a versioned immutable registry of
the exact canonical P0/P1 assembled prompt SHA-256 values for each pinned case,
derived from the existing trusted-proof preflight assembler. It does not call a
provider or test effectiveness.

## Contract for alpha

1. Add a self-hashing prompt-digest registry with pinned source/dataset/slot
   registration/trusted-proof-digest registry bindings, `case_id`, `P0` and
   `P1` prompt digests, plus the exact base/wrapper template identities used by
   the no-live builder. Never put raw prompts, oracle contracts or raw provider
   output in the registry.
2. Version the receipt format (v2; do not reinterpret v1) so that it binds the
   prompt-digest registry. Every record must carry an actual `prompt_sha256`.
   P0/P1 accept only the exact registered digest for that case/condition.
3. Candidate raw evidence must have a separate local prompt-artifact reference
   and SHA-256; it is resolved only under `--raw-root`, read and hashed by the
   intake. The record hash must equal both that artifact and the registered
   digest. A raw response is therefore inseparable from the exact submitted
   prompt in the receipt.
4. Preserve append-only semantics: no shared prompt/raw reference, no
   superseding record, no silent v1 upgrade. The existing snapshot/query/slot/
   P1 proof, retry, equal-`E`, leakage and local-only raw gates all remain.
5. Use only an explicitly synthetic non-result v2 fixture and deterministic
   tests. The synthetic fixture may have nonexistent local paths and must not
   be eligible as a candidate/live result.

## Required negative evidence

The validator self-test must reject a syntactically valid but wrong prompt
digest, a P0/P1 digest swap, a changed outside-slot prompt artifact, a prompt
artifact whose SHA does not match the record, a registry self-hash/binding
tamper, and a v1 envelope passed as v2. The full project suite remains green.

## CDR beta exit

Fresh beta recomputes the registry from the pinned no-live assembler where
available; confirms its source and all input bindings; independently applies
the listed mutations; and confirms no adapter/provider/network/model call,
raw live artifact, aggregation or effectiveness claim exists. Its only success
verdict is `GO_PREPARATION`.
