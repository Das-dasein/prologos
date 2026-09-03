# Invalid beta review — same-session contamination

Status: invalid as a CDR verdict. The reviewing body previously authored the
alpha matter in the same agent session, violating the alpha != beta actor floor.
Preserved only as a process-failure receipt; a fresh beta must audit from the
alpha artifacts and produce the canonical `beta-review.md`.

# Former beta review — prolog-memory-eval-v0

Review role: fresh CDR β session, independent of α. Review date: 2026-09-03.
Input scope: only the alpha matter named by the wave manifest. No alpha file
was repaired or rewritten.

## Verdict

**REVISE** — the method and labels are substantially specified, but the
declared symbolic pilot is not executable from the existing commands as
written. The correction/supersession cases require a harness-level assertion
of `supersedes/2`, while the method explicitly provides no pinned harness.
The leakage and budget sentinels are described but no executable check or
machine-readable run configuration is supplied. Until those gaps are fixed,
β cannot certify the GO gate that requires executable method and sentinel
detection. This is a method-protocol finding, not a claim about PAM utility.

## Oracle audit

- Falsifiability: **PASS**. PAM-C1–C4 are tied to exact active-state,
  conflict, extraction, provenance, and stale/contradictory-error metrics;
  thresholds are copied without post-result weakening.
- Diagnostic oracles: **PARTIAL**. The leakage sentinel (`stable-01`) and
  unequal-budget sentinel are named, but no command/configuration makes either
  mechanically runnable.
- Reproduction from clean: **PARTIAL**. Source snapshot hashes all reproduce,
  and `npm test` passed in a clean temporary copy with copied locked
  dependencies and fixtures. The 12-case symbolic oracle itself was not run:
  no pilot harness exists, and supersession is not persisted by
  `MemoryStore`.
- Citation integrity: **PASS / not applicable**. No external substantive
  claim or citation is used; the method cites only the local policy and source
  snapshot.
- Data policy: **PASS**. The dataset is synthetic, the private
  `data/memory.pl` is excluded, and the dataset SHA matches its manifest.
- Claim/evidence alignment: **PASS for current status**. Alpha labels method
  adequacy `hypothesized` and reports no model result or architecture success
  claim. No observed/computed receipt was emitted.

## Independent integrity checks

The JSONL parses as 12 records with exactly two cases in each of the six
registered categories. All gold write proposals satisfy the implementation
allowlist, atom syntax, date bounds, and confidence bounds. The standalone
oracle JSON parses and contains expected operation, active-state,
conflict-state, and query-answer indexes. SHA-256 is
`b5b394c60cbbb287ce4a8e15886e377e51437b4453a56e4e42c7ad31e21c6acc`; source
snapshot `shasum -a 256 -c` returned OK for all 15 files.

## Findings returned to α/γ

1. **D — reproducibility / executable method:** add a separately pinned pilot
   harness (or revise the method to an existing command) that injects gold
   claims, asserts `supersedes(New,Old)`, runs exact active/conflict/query and
   provenance comparisons, and emits raw machine-readable output. Do not
   report symbolic correctness until this run exists.
2. **C — diagnostic executability:** add an executable leakage scan proving
   stable-01 gold IDs/proposals are absent from model prompts, and a recorded
   token-budget configuration/check that rejects unequal effective budgets.
3. **C — provider reproducibility:** before any observed/computed answer claim,
   pin provider/model/version, prompt version, context budget, sampling,
   timeout, and retry policy in a run manifest. The current method requires
   these but does not identify a concrete provider or run configuration.

## Scope and limitations

No live-model benchmark was requested or performed. The pilot remains a
synthetic protocol test and cannot establish product usefulness, novelty, or
statistical significance. A later α revision may address the findings; β does
not author that repair. The verdict is therefore `REVISE`, not GO,
BOUNDED-GO, or a result about PAM-C1–C4.
