# Wave status: prolog-memory-eval-v0

- Last updated: 2026-09-03 by delta=gamma after independent beta R1
- State: `REVISE`
- Gate verdict: not issued
- Receipt: absent; no research claim is transmissible

| Stage | Actor requirement | State | Evidence |
|---|---|---|---|
| Project binding | delta=gamma | complete | `.cdr/POLICY.md` |
| Pre-registration | gamma | complete | `manifest.md`, open-claim ledger |
| Research production | fresh alpha | revision required | `alpha-report.md` |
| Independent audit | fresh beta, not alpha | complete: REVISE | `beta-review.md`, `beta-review-r1.md` |
| Receipt emission | gamma | blocked on alpha repair plus beta re-audit | `receipt.cue` or `receipt.yaml` |
| Boundary decision | delta | blocked on receipt gates | not issued |

Next transition: route the executable evaluation harness as separate CDS
matter. The source checksum defect is corrected in the manifest, but a fresh
beta re-audit is required after the checksum change. Receipt remains blocked
until the pinned harness produces raw output and beta verifies it.
