# CDR α diagnostic: offline evaluator v3 frozen replay r2

Date: 2026-09-05 (Europe/Samara). Role: fresh CDR α. This is a post-hoc
diagnostic of immutable evidence, not a live experiment, β verdict, typed
receipt, or implementation report.

## Scope and immutable inputs

The only evaluated replay is `reports/live-20260905-152059/replay-v3-r2.json`.
The evaluator is pinned to `offline-eval-v3.js@80ca1d44cfcfeeab3c6124bbebedae74ba688f6f`
(`80ca1d4`), whose SHA-256 is
`34803d238706979ee25a40be28b3e8de48daaef593a34962d6608e78ed094e47`.
The replay SHA-256 is
`d4653498eae6cedc2e0e0628a4d55c78c21e278deba6719f078b05092ad0c801`.

Frozen input hashes are:

| input | SHA-256 |
|---|---|
| dataset `.cdr/datasets/dialogues-pilot-v1.jsonl` | `ed9dd7f7ab4983266ab2df3a5ccb31a1f8b367163a09f2c57d2d096e8699d041` |
| answer oracle `.cdr/results/prolog-memory-eval-v0/answer-oracle-v1.json` | `aee569c01d79403b0b5d92de135238958c2e60c608a91b8ed495ffcd114e36f5` |
| aggregate | `5bb56b77d060d73643b00e545c596e7fddc49c9d8ce97ac8189590f5b9c8d2cb` |
| raw manifest | `ecf5036602dd3d27782fa95749cbdcc547e4b7fd4ff2c51ac4c57b2c19b83e21` |

The replay binds run `20260905-152059`, has four conditions with 12 cases each,
and reports 192 referenced raw files, all present with matching hashes. The
configured/measured effective context budget is 32768 for every request in the
stored aggregate. The historical manifest claims source commit
`586a8fff9f41c7e6a84822b2a1a46df7e5927f7e`, but the exact source identity
executed historically is explicitly `unknown`; this diagnostic uses the
immutable evaluator commit above only as the replay scorer.

## Computed B1–B4 diagnostics

Counts below are calculated from the frozen replay by status. They are
diagnostic rubric outcomes, not model-quality results. `pass/fail/unknown`
always has denominator 12 for answer-level metrics. Provenance is `unknown`
when the answer envelope has no usable provenance; it is not reconstructed
from context. Extraction totals use the evaluator's one-to-one denominators.

| condition | content pass/fail/unknown | provenance pass/fail/unknown | stale-or-contradictory pass/fail/unknown | extraction precision | extraction recall | unsupported assertions |
|---|---:|---:|---:|---:|---:|---:|
| B1 | 5/7/0 (5/12) | 4/0/8 (4/12) | 9/3/0 (9/12) | 13/17 | 13/16 | 4/17 |
| B2 | 5/7/0 (5/12) | 4/0/8 (4/12) | 9/3/0 (9/12) | 15/17 | 15/16 | 2/17 |
| B3 | 8/4/0 (8/12) | 4/0/8 (4/12) | 11/1/0 (11/12) | 15/18 | 15/16 | 3/18 |
| B4 | 6/6/0 (6/12) | 4/0/8 (4/12) | 11/1/0 (11/12) | 14/17 | 14/16 | 3/17 |

At the per-turn extraction-decision level, the computed pass/fail/unknown
counts are B1 `32/4/0` (36), B2 `34/2/0` (36), B3 `33/3/0` (36), and B4
`33/3/0` (36). These are operation-decision rubric counts, not independent
model-quality observations.

The replay also records legacy text-exact as 0/12 for every condition. That
field is retained historical scoring and is not used here as the answer
oracle. The stale/conflict status is the deterministic rubric's classification;
it is not a causal estimate of stale-answer risk. No B5 value is included in
the table: B5 is a gold-claim symbolic oracle ceiling, not a user-facing
baseline.

## Claim calibration

### Computed

- The counts and fractions in the table are computed from replay-v3-r2 using
  evaluator v3 at the pinned commit and the declared hashes.
- The stored raw-integrity check is valid (192 referenced files; no missing or
  mismatched referenced file).
- The stored aggregate reports equal measured effective budgets of 32768 across
  B1–B4.

### Inferred

- Within this deterministic rubric, B3 has more content passes and fewer
  stale/conflict failures than B1/B2, while B4 has fewer content passes than
  B3 but the same stale/conflict status (6/12 content and 11/12 stale pass).
- These differences are compatible with extraction/context-path differences,
  answer formatting/provenance handling, or rubric behavior. The replay does
  not isolate which mechanism produced them.

### Hypothesized / not established

- H-EVAL: the frozen evaluator's diagnostics are a faithful, reproducible
  characterization of the historical raw artifacts under its deterministic
  rubric. This is a bounded engineering/replay hypothesis, not validation of
  the registered live evaluation method.
- H-CAUSE: changing the memory mechanism, and specifically adding Prolog in
  B4, caused any observed B1–B4 difference. This is not identified by the
  replay because the provider was fake/offline, the historical executed source
  identity is unknown, and extraction and answering outcomes are already
  confounded with their supplied raw artifacts.
- PAM-C1 (Prolog reduces stale-or-contradictory answer errors versus the
  strongest non-Prolog baseline) remains `hypothesized`; no superiority or
  product-usefulness claim is made.

## Falsifiers and limitations

H-EVAL would be falsified for this bounded replay if the pinned replay hash,
input hashes, raw-manifest integrity, run binding, or independent execution
of evaluator v3 disagreed; if missing raw evidence were counted as pass; or if
the deterministic evaluator silently reconstructed unknown provenance. None
of those failures is visible in replay-v3-r2, but historical source identity
uncertainty remains a limitation.

H-CAUSE would be falsified by a controlled, preregistered run with the same
model/provider, prompts, retry and sampling policy, exactly measured equal
context budgets, controlled extraction quality, and an outcome showing no
Prolog improvement (or a matched intervention showing the difference comes
from extraction, answer formatting, or another non-Prolog change). The current
replay cannot perform that test: it made no provider/network/retry call, used a
fake provider's historical outputs, uses a deterministic rubric rather than an
LLM judge, and is post-hoc. Missing answer provenance remains unknown. The
12-case pilot is unsuitable for significance or generalization claims.

No threshold, dataset, oracle, historical aggregate/raw output, provider
configuration, or claim ledger was changed. No live run was made. This report
does not retro-validate PAM-C1, does not convert B5 into a baseline, and does
not issue a β verdict or CDR receipt.
