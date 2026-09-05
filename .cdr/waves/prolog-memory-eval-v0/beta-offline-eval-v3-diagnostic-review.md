# CDR β review: offline evaluator v3 α diagnostic

Date: 2026-09-05 (Europe/Samara). Role: fresh, independent CDR β.
Review target: immutable α report at commit `57a2293` and the frozen replay and
evaluator artifacts it references. This review is bounded to replay integrity
and report calibration; it is not a live experiment and makes no PAM-C1,
superiority, or product-usefulness claim.

## Reproduction and integrity checks

The following checks were rerun against the repository artifacts without
changing the implementation, replay, dataset, oracle, manifest, or α report:

```text
sha256(offline-eval-v3.js)                                      = 34803d238706979ee25a40be28b3e8de48daaef593a34962d6608e78ed094e47
sha256(reports/.../replay-v3-r2.json)                          = d4653498eae6cedc2e0e0628a4d55c78c21e278deba6719f078b05092ad0c801
sha256(reports/.../aggregate.json)                             = 5bb56b77d060d73643b00e545c596e7fddc49c9d8ce97ac8189590f5b9c8d2cb
sha256(.cdr/datasets/dialogues-pilot-v1.jsonl)                  = ed9dd7f7ab4983266ab2df3a5ccb31a1f8b367163a09f2c57d2d096e8699d041
sha256(.cdr/results/.../answer-oracle-v1.json)                  = aee569c01d79403b0b5d92de135238958c2e60c608a91b8ed495ffcd114e36f5
sha256(reports/.../manifest.json)                              = ecf5036602dd3d27782fa95749cbdcc547e4b7fd4ff2c51ac4c57b2c19b83e21
```

`npm run eval:offline:v3 -- --output=/tmp/replay-beta-check.json` completed
successfully and produced replay hash
`d4653498eae6cedc2e0e0628a4d55c78c21e278deba6719f078b05092ad0c801`.
The evaluator at `80ca1d44` has the same source-file hash. The replay's run
binding is `20260905-152059`; its raw-manifest integrity is valid with 192
referenced files, zero missing files, and zero hash mismatches. The equal
effective context budget is 32768 for B1–B4 as recorded in the aggregate.
The schema and sentinel checks also pass:

```text
npm run test:offline-eval:v3
npm run test:offline-eval:schema
```

## Independent recomputation

The α table is reproduced exactly from the replay:

| condition | content pass/fail/unknown | provenance pass/fail/unknown | stale/conflict pass/fail/unknown | extraction precision | extraction recall | unsupported |
|---|---:|---:|---:|---:|---:|---:|
| B1 | 5/7/0 | 4/0/8 | 9/3/0 | 13/17 | 13/16 | 4/17 |
| B2 | 5/7/0 | 4/0/8 | 9/3/0 | 15/17 | 15/16 | 2/17 |
| B3 | 8/4/0 | 4/0/8 | 11/1/0 | 15/18 | 15/16 | 3/18 |
| B4 | 6/6/0 | 4/0/8 | 11/1/0 | 14/17 | 14/16 | 3/17 |

Per-turn extraction decisions also match: B1 `32/4/0`, B2 `34/2/0`, B3
`33/3/0`, and B4 `33/3/0` (pass/fail/unknown, denominator 36 each).
These are deterministic rubric and extraction-decision counts, not independent
model-quality observations.

## Calibration and boundary review

The α report correctly separates computed counts and integrity results from
inferences about visible condition differences and hypotheses H-EVAL/H-CAUSE.
It correctly records the fake/offline provider, deterministic rather than LLM
judging, post-hoc design, unknown historical executed source identity, unknown
provenance handling, and the 12-case pilot limitation. Its falsifiers are
operationally meaningful for replay integrity and for a future controlled
causal run. The statement that B3 has more content passes than B1/B2 and that
B4 has fewer than B3 is supported by the replay, but the report appropriately
does not identify a mechanism.

One residual limitation is correctly left visible: the replay binds the
evaluator by source hash and historical metadata retains a claimed source
commit, but `executed_source_identity` is explicitly `unknown`. Thus the
artifact supports a reproducible post-hoc replay computation, not provenance
of the historical model execution.

The α report does not change thresholds, raw outputs, aggregate, claims, or
the registered method. It explicitly declines a typed receipt and β verdict,
leaving those to this independent review and γ. A receipt, if issued, must be
typed as bounded `computed` evidence with reproduction metadata and explicit
limitations; it must not assert PAM-C1 or Prolog superiority.

## β verdict

**GO — bounded CDR diagnostic and typed-receipt preparation.** The α report is
reproducible and evidence-calibrated for the immutable offline replay. γ may
issue a typed CDR receipt only for the computed replay diagnostics and their
stated evidence boundary, with this review as the independent β evidence. A
live controlled evaluation and fresh review remain required for any causal or
superiority claim; none is granted here.

