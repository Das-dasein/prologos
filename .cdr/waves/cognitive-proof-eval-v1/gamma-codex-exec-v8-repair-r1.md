# Gamma CDR repair R1 — Codex exec v8 evidence closure

## β R1 blocker set

β R1 (`6c27daf`) showed that v8 accepted mutable scorer data, incomplete pairs,
an executable different from its sealed command, partly unbound config, and a
raw-reference wrapper rather than the evidence that generated native usage.
All are integrity blockers, not cosmetic schema omissions.

## Required alpha repair

Only modify the v8 Codex preparation path.

1. **Closed receipt shape and cardinality.** Require exact fields at every
   receipt/run/record/scorer/artifact level. Pin scorer to exactly
   `{decision:"accepted", contract_sha256: sha256("cognitive-proof-hidden-contract-v1")}`.
   A candidate must contain exactly one P0 and one P1 record for every
   registered case: 24 unique records, no omissions/duplicates/extras.
2. **Executable provenance.** Production collector may only invoke literal
   `codex`; remove `CODEX_BIN`/caller binary production selection. Retain fake
   spawn as a dependency-injection seam, but no injected binary may produce a
   candidate receipt. Pin executable and command arguments in registry/run.
3. **Complete config authority.** Require exact config keys/values and
   self/file hash binding for provider, source, model, sampling, retry policy,
   dataset/slot identities and exact v8 wire/source/schema/command authority.
   Do not silently replace or ignore a config value.
4. **Raw evidence recomputation.** Store immutable per-attempt JSONL stdout,
   stderr and final-output artifacts as explicit receipt references/hashes.
   At intake, resolve them only below raw root; parse JSONL and final output;
   recompute Codex native usage and answer-schema conformance; require those
   recomputed values to equal record usage and sealed response evidence.

## Negative evidence

Add falsifiers for each β mutation: arbitrary/extra scorer, missing/duplicate
condition, binary/environment substitution, every config authority dimension,
extra receipt/run/record fields, raw JSONL/final tampering, event usage/output
disagreement, unsafe/missing/duplicate raw refs.  All must reject before a
candidate receipt is emitted.  Tests remain fake-spawn only.

## Boundary

Do not change or invoke v7/OpenAI, `codex exec`, credentials, dataset, Prolog,
scorer semantics, evaluator outcome or result claims. Fresh β must audit the
repair; only a later human run creates evidence for a future CDR decision.
