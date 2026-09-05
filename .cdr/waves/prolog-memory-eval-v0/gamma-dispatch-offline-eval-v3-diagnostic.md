# γ dispatch: CDR post-hoc diagnostic of offline evaluator v3

Role: fresh CDR α. Matter: research analysis of immutable frozen replay.
This is not a live experiment and must not modify historical outputs, claims,
thresholds, dataset, oracle, or provider configuration.

## Research question

Which visible B1–B4 differences are supported by the frozen replay, and which
cannot be attributed to extraction quality, memory quality, or Prolog?

## Required evidence

- `offline-eval-v3.js@commit:80ca1d4`
- `reports/live-20260905-152059/replay-v3-r2.json`
- replay SHA-256 `d4653498eae6cedc2e0e0628a4d55c78c21e278deba6719f078b05092ad0c801`
- dataset and answer-oracle hashes from the replay manifest
- prior β reviews, including `beta-offline-eval-v3-review-r2.md`
- `.cdr/POLICY.md` and `prolog-memory-evaluation-v2.md`

## Acceptance criteria

1. Report B1–B4 computed pass/fail/unknown counts with numerators and
   denominators; do not call them model-quality results.
2. Separate `computed`, `inferred`, and `hypothesized` statements.
3. Analyse H-EVAL and H-CAUSE with explicit falsifiers; do not retro-validate
   PAM-C1 or convert B5 into a baseline.
4. Record historical source-identity uncertainty, fake-provider limitation,
   deterministic rubric, unknown provenance, and post-hoc design.
5. Produce one report at
   `.cdr/waves/prolog-memory-eval-v0/alpha-offline-eval-v3-diagnostic.md`.

## Boundaries

No provider, network, retry, LLM judge, new dataset, threshold change, or live
run. The report is CDR α matter. A fresh independent CDR β must review it; γ
will then emit the typed receipt with the verdict matching β.
