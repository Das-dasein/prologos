# Wave status: prolog-memory-eval-v0

- Last updated: 2026-09-03 by delta=gamma after CDS evidence refresh
- State: `REVISE`
- Gate verdict: not issued
- Receipt: absent; no research claim is transmissible

| Stage | Actor requirement | State | Evidence |
|---|---|---|---|
| Project binding | delta=gamma | complete | `.cdr/POLICY.md` |
| Pre-registration | gamma | complete | `manifest.md`, open-claim ledger |
| Research production | fresh alpha | revision required | `alpha-report.md`; CDS candidate evidence is available but not yet independently reviewed |
| Independent audit | fresh beta, not alpha | complete: REVISE | `beta-review.md`, `beta-review-r1.md` |
| Receipt emission | gamma | blocked on alpha repair plus beta re-audit | `receipt.cue` or `receipt.yaml` |
| Boundary decision | delta | blocked on receipt gates | not issued |

CDS candidate evidence now available for review:

- harness source: commit `f8796abc1c7c9a0ff2c9a61b32841e0b83bdd250`;
- pinned config: `.cdr/results/prolog-memory-eval-v0/eval-config-v1.json`;
- raw symbolic B5 output: `.cdr/results/prolog-memory-eval-v0/gold-run-v1.json`;
- current source identity: `source-snapshot-f8796ab.manifest.md` and its
  passing SHA-256 file-level check.

Known bound: this evidence covers deterministic gold injection only. It does
not execute a live-model extraction or answer condition, so prompt-leakage and
cross-condition context-budget sentinels remain unverified.

Next transition: a fresh independent CDR beta re-audit must reproduce the
pinned symbolic evidence, verify the replacement source snapshot, and decide
whether the remaining live-model-sentinel gap keeps the wave at `REVISE`.
Receipt remains blocked until that review and every required gate are complete.

Dispatch handoff: `beta-dispatch-r2.md`.
