# Gamma specification: live-extraction-harness-v1

Decision: bounded GO for alpha implementation.
Issue: GitHub #17.
Related CDR work: #5 extraction annotation and #7 method repair.

## Contract

The harness reads only the synthetic pilot turns and an explicit run config. It
assembles the exact extraction prompt/context for each turn, checks it before a
provider call, validates provider output as `memory-extraction-v2` against the
active ontology identity, and emits a normalized local record. It never sends
gold operations, gold IDs, oracle answers, `data/memory.pl`, private markers,
or a writable trusted-memory path to a provider.

Every normalized record must name the source commit, dataset SHA-256, profile
identity, provider/model, prompt SHA-256, sampling/retry configuration,
turn/case ID, context-usage evidence, provider result or structured failure.
Raw provider output is local-only until privacy review; Git tracks neither API
keys nor raw live output.

## Acceptance checks

1. **V2 validation without write.** A current-profile fake response becomes a
   normalized extraction record; `MemoryStore.add` is not called and trusted
   memory/registry bytes remain unchanged.
2. **Prompt leakage preflight.** A prompt containing `c_stable_01_a` or its
   serialized gold proposal fails before the provider adapter runs. Private
   marker input does the same.
3. **Identity and output boundary.** A stale registry identity, malformed
   response, unknown output field, or invalid candidate cannot create a
   successful extraction record.
4. **Context accounting.** The harness records provider-reported usage when
   available and rejects missing evidence or a configured budget breach. It
   does not invent token counts.
5. **Reproducibility.** Fake-provider valid and negative fixtures produce
   deterministic normalized output, including config/dataset/profile hashes.
6. **Regression.** Existing CDD and CDR deterministic commands remain green.

## Implementation constraints

- The active `memory-extraction-v2` schema is authoritative; do not add a
  second extraction vocabulary or revive a hard-coded relation allowlist.
- Keep provider invocation behind an explicit adapter/config flag. Test and CI
  use only fake providers.
- A live config must require an exact provider/model identifier, temperature
  (or documented deterministic equivalent), retry policy and maximum context
  budget. Absent values reject.
- This cell produces no precision/recall score and no B1--B5 comparison.
- Do not change `.cdr/POLICY.md`, the pilot dataset, oracle, claim ledger or
  thresholds in this implementation cell.

## Handoff

Alpha returns source, focused tests, a self-coherence report and a sample fake
run only. Fresh beta reviews the immutable implementation. Gamma may then
close #17 as software evidence. CDR #5/#7 separately decide whether the
annotation oracle is adequate and whether an opt-in live run is admissible.
