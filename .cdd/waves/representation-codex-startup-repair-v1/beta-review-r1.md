# β review R1: representation-codex-startup-repair-v1

Reviewed commit `e8eb32b`. Verdict: **APPROVE** (bounded CDD method).

β independently passed the trusted-proof and representation Seatbelt tests,
the real macOS Codex startup probe, resolved-SWI denial, and `npm test`. The
Codex executable is staged in each sealed `state/codex-bin`; no home-directory
grant is introduced. Repository, evaluator/evidence, memory, host credential,
and P0/P1 SWI denials remain. P2's one no-argument broker rule remains.

No provider/model call or credential inspection occurred. A new raw root is
required for any subsequent live run; the prior all-failure run remains frozen.
