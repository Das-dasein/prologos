# CDR/CDS β dispatch: offline evaluator v3 repair

Role: fresh independent β.
Target commit: `80ca1d4` (`Repair offline evaluator v3 integrity semantics`).
Review boundary: the bounded offline evaluator only; no PAM-C1 or model-quality
claim is in scope.

## Read first

- `.cdr/POLICY.md`
- `.cdr/proposals/evaluation-contract-repair-v3.md`
- `.cdr/proposals/alpha-offline-eval-v3-report.md`
- `.cdr/proposals/beta-offline-eval-v3-review.md` (prior `REVISE`; findings to
  re-check, not a substitute for this review)
- `offline-eval-v3.js`
- `test-offline-eval-v3.js`
- `schemas/offline-eval-v3.schema.json`
- `reports/live-20260905-152059/replay-v3-r2.json`

## Independent review requirements

Review a clean checkout pinned to `80ca1d4`. Do not edit implementation,
historical aggregate/raw artifacts, dataset, oracle, or thresholds. Do not call
a provider, network, retry loop, or LLM judge.

Re-run at minimum:

```text
npm run test:offline-eval:v3
npm test
npm run test:pilot
node offline-eval-v3.js --aggregate=reports/live-20260905-152059/aggregate.json --dataset=.cdr/datasets/dialogues-pilot-v1.jsonl --oracle=.cdr/results/prolog-memory-eval-v0/answer-oracle-v1.json --raw-manifest=reports/live-20260905-152059/manifest.json --expected-run-id=20260905-152059 --source-snapshot=offline-eval-v3.js --output=/tmp/replay-v3-beta.json
```

Verify the three blocking findings from the prior review:

1. Relabelling the manifest run identity is rejected.
2. A zero denominator reports `coverage: null`, not zero.
3. Missing referenced raw is represented as explicit `indeterminate`; hash
   mismatch remains fail-closed.

Also verify aggregate-to-manifest identity binding, deterministic replay,
historical-artifact immutability, and the absence of any CDR usefulness claim.

## Output

Write a standalone review artifact at
`.cdr/proposals/beta-offline-eval-v3-review-r2.md` containing the verdict,
exact reviewed SHA, clean-copy commands, observed hashes, each adversarial
fixture result, limitations, and an explicit claim/evidence boundary.

The review must remain independent of γ and must not emit a CDR receipt. γ will
triage the result after it is committed.
