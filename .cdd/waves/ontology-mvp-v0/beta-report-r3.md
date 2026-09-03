# Beta R3 report: ontology-mvp-v0

## Verdict

**PASS.** Commit `d735835e8a8d3c5240896172ead4317ea0562623` closes the R2
runtime-predicate boundary defect. The immutable denylist is checked
independently of the selected registry, including caller-injected registries,
and the focused and full regression suites are green.

## Scope and source

- Audited exactly commit `d735835` (`d735835e8a8d3c5240896172ead4317ea0562623`).
- Read: `manifest.md`, `status.md`, `gamma-spec.md`, and
  `alpha-repair-report-r3.md`.
- Audited `ontology-harness.js`, `ontology-runner.pl`, and
  `test-ontology-harness.js` without modifying implementation or tests.
- `git diff --check d735835^ d735835` was clean; the report is the only new
  artifact from this audit.

## Commands and results

```text
node test-ontology-harness.js       # ontology-harness ok
npm test                             # ok; memory-store ok; codex-provider ok
swipl --version                     # SWI-Prolog 10.0.2 arm64-darwin
git diff --check d735835^ d735835   # clean
```

An independent public-API probe also passed. It tested all 56 exported
reserved names at registry construction (syntax-invalid `!` is rejected by
the registry grammar; all valid reserved names report `IMMUTABLE_PREDICATE`),
and tested runtime/system/meta/loading names through proposal-declared and
manually injected registries. In particular, `consult/1`,
`ontology_derived/1`, `assert/1`, and `retract/1` are rejected before SWI;
additional checks covered `call`, `use_module`, `include`, `assertz`,
`abolish`, `current_predicate`, `findall`, `open`, `shell`, `process_create`,
`halt`, `true`, `fail`, and `is`. Rejection records were path-free.

The custom domain registry remains executable: `connected_to/2` derives
`socially_connected/1` successfully when the registry is supplied, while the
same proposal is rejected without it. This confirms the denylist does not
collapse the declaration-based domain extension boundary.

## Preserved boundaries

- The prior answer-scoped provenance regression remains green: an unrelated
  successful rule is excluded from `supporting_rules`.
- Malformed JSON returns `candidate_version: null`; a recoverable top-level
  version is preserved on rejection.
- Missing SWI returns structured `SWIPL_NOT_FOUND` without an executable path.
- Two identical runs produced identical result objects; SHA-256 checks of
  `memory.pl` and `data/memory.pl` before and after remained unchanged, and no
  `pam-ontology-*` temporary directories remained.

The harness still provides synthetic engineering evidence only. The
`active_claims`, `conflicts`, and `provenance` query paths are empty fixture
adapters, and this audit does not establish ontology quality or product
utility. The focused suite does not independently add fake-worker timeout and
non-zero-exit cases beyond the existing repaired error-normalization path;
that remains a test-coverage limitation, not an observed R3 failure.

## Pinned CDR F3 decision

**Approved for pinning as the immutable CDD harness dependency for CDR F3:**
pin commit `d735835e8a8d3c5240896172ead4317ea0562623` and retain the source
hashes below. This approval is an engineering-boundary decision only; it is
not a CDR receipt, threshold result, or product claim.

```text
ontology-harness.js       1bd9b63e07cd2f6850ddcab220d9cdf6cf8c9f236ae76ecd409e3b5e9729208f
ontology-runner.pl        b046f86d8a7cac9134cc074da0d531443e3389fd1a6bfabd6c1e0c9b08469b7e
test-ontology-harness.js   6461e66dc9595c56bc18b8eebe29625fdb55ce4c0610e138c32024eb242549c4
```
