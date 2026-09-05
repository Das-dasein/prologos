# Wave status: prolog-memory-eval-v0

- Last updated: 2026-09-05 by fresh CDR alpha repair R2
- State: `REVISE`
- Gate verdict: not issued
- Receipt: absent; no research claim is transmissible

| Stage | Actor requirement | State | Evidence |
|---|---|---|---|
| Project binding | delta=gamma | complete | `.cdr/POLICY.md` |
| Pre-registration | gamma | complete | `manifest.md`, open-claim ledger |
| Research production | fresh alpha | revision required | `alpha-repair-report-r2.md`, `prolog-memory-evaluation-v2.md`, and CDS handoff contract; B4 remains historical exploratory evidence |
| Independent audit | fresh beta, not alpha | complete: REVISE | `beta-review.md`, `beta-review-r1.md`, `beta-review-r2.md` |
| Receipt emission | gamma | blocked on alpha repair plus beta re-audit | `receipt.cue` or `receipt.yaml` |
| Boundary decision | delta | blocked on receipt gates | not issued |

CDS candidate evidence now available for review:

- harness source: commit `f8796abc1c7c9a0ff2c9a61b32841e0b83bdd250`;
- pinned config: `.cdr/results/prolog-memory-eval-v0/eval-config-v1.json`;
- raw symbolic B5 output: `.cdr/results/prolog-memory-eval-v0/gold-run-v1.json`;
- current source identity: `source-snapshot-f8796ab.manifest.md` and its
  passing SHA-256 file-level check.

The saved `.cdr/results/prolog-memory-eval-v0/pilot-b4-codex-exploratory-v1.json`
is classified by alpha R2 as an exploratory, non-transmissible artifact. Its
stored 19,111–19,937 token usages exceed the historical 4096 setting, its
config/raw-output provenance is incomplete, and its source commit predates the
Codex adapter used to produce the recorded shape. It is not retro-validated
under the v2 amendment.

Known bound: this evidence covers deterministic gold injection only. It does
not execute a live-model extraction or answer condition, so prompt-leakage and
cross-condition context-budget sentinels remain unverified.

Next transition: a separate CDS cycle must satisfy
`cds-handoff-contract-v2.md`, then a fresh independent CDR beta re-audit must
review its raw B1–B4 outputs together with the pinned symbolic evidence. Until
then the missing live-model execution and measured equal context budget keep
the wave at `REVISE`.
Receipt remains blocked until that review and every required gate are complete.

Dispatch handoff: `beta-dispatch-r2.md`.

R2 decision: the pinned B5 symbolic slice is reproducible and bounded, but the
registered live-model leakage and cross-condition context-budget sentinels are
not executable in the reviewed harness. The prospective v2 amendment removes
the old absolute budget ceiling while retaining measured equality across
B1–B4. No CDR receipt, GO, BOUNDED-GO, or primary PAM usefulness claim is
authorized.

Next priority after this review: extend the separately pinned CDS harness for
the registered live conditions under the v2 contract. The v2 amendment is now
recorded prospectively; a future beta must review its new matter independently.
This R2 verdict does not pre-approve it.
