# Alpha repair report R1 — prolog-memory-eval-v0

Repair scope is limited to canonical beta findings F1–F5. No executable CDS
harness was authored and the wave remains open for fresh beta re-audit.

## Repairs

- **F1 (oracle):** stable and correction queries now use `active_claim/7` (or
  the declared `current_project/3` rule); the Python query asks for
  `knows_technology/2`; temporal queries bind an injected claim and apply
  `overlaps/4`. Expected answers, including source/date bindings, were updated
  in the JSONL dataset and `pilot-oracle.json`. A local Tau Prolog check shows
  the repaired predicates succeed under case-local gold injection. The clean
  beta reproduction must still be rerun independently.
- **F2 (end-to-end oracle):** added `answer-oracle-v1.json`, authored before
  model output, with an acceptable-answer contract, per-case expected answer,
  source claim IDs, source turns, date intervals, and deterministic
  stale/conflict classification. This makes PAM-C4 and provenance scoring
  mechanically labelable; natural-language semantic matching remains the
  harness's declared scorer responsibility.
- **F3 (execution/sentinels):** method v1 now fixes provider class, sampling,
  retry, prompt IDs, 4096-token budget, canonical CDS harness command, raw
  output requirements, leakage abort, and budget rejection behavior. No pinned
  CDS harness exists in this snapshot, so this finding is explicitly pending
  separate CDS work and is not represented as reproduced evidence.
- **F4 (baseline):** method v1 now pre-registers strongest-baseline selection
  from B1–B3 by stale/contradictory error, then general-answer error, then
  fixed B3/B2/B1 tie-break order, and requires all baseline scores. The fixed
  configuration and effective-budget accounting are part of the execution
  contract.
- **F5 (manifest):** source provenance now says the workspace was a Git work
  tree with no commit, with the observed commands and SHA-256 pins as the
  source identity.

## Calibration and handoff

Method adequacy and all PAM architecture claims remain `hypothesized`. The
repair changes labels and reproducibility contracts; they are not model
results. Fresh beta must rerun the gold-injection queries and audit the new
answer oracle, configuration, and manifest. Gamma/delta review and close-out
are outside this repair session.
