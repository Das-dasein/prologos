# β review: offline evaluator v3 repair (r2)

Date: 2026-09-05. Reviewer: fresh independent CDR/CDS β. Reviewed immutable
target commit `80ca1d44cfcfeeab3c6124bbebedae74ba688f6f` (`80ca1d4`). The review
was performed from a git archive clean copy; no implementation, historical
aggregate/raw artifacts, dataset, oracle, or thresholds were edited.

## Verdict

`GO` for the bounded offline-evaluator engineering scope. The three blocking
findings in the prior β review are repaired and independently reproduced. This
is not a CDR receipt and does not establish PAM-C1, model quality, or a Prolog
usefulness/superiority claim.

## Clean-copy reproduction

The clean copy was created and pinned as follows (the archive contains the
exact target tree; `node_modules` was copied only as a local test dependency):

```sh
clean=$(mktemp -d /tmp/offline-eval-beta-v3-r2.XXXXXX)
git archive 80ca1d4 | tar -x -C "$clean"
cp -R node_modules "$clean/node_modules"
```

Observed target SHA:

```text
80ca1d44cfcfeeab3c6124bbebedae74ba688f6f
```

Required clean-copy commands all passed:

```text
npm run test:offline-eval:v3       PASS (offline-eval-v3 sentinels)
npm test                            PASS
npm run test:pilot                 PASS
```

The explicit replay command from `beta-offline-eval-v3-dispatch-r2.md` also
passed. Its output was written to `/tmp/replay-v3-beta.json`.

## Replay evidence and hashes

The clean replay and checked-in `reports/live-20260905-152059/replay-v3-r2.json`
were byte-identical:

```text
d4653498eae6cedc2e0e0628a4d55c78c21e278deba6719f078b05092ad0c801
```

Input and source hashes observed in the clean copy:

```text
aggregate.json       5bb56b77d060d73643b00e545c596e7fddc49c9d8ce97ac8189590f5b9c8d2cb
dialogues-pilot-v1   ed9dd7f7ab4983266ab2df3a5ccb31a1f8b367163a09f2c57d2d096e8699d041
answer-oracle-v1    aee569c01d79403b0b5d92de135238958c2e60c608a91b8ed495ffcd114e36f5
manifest.json       ecf5036602dd3d27782fa95749cbdcc547e4b7fd4ff2c51ac4c57b2c19b83e21
offline-eval-v3.js   34803d238706979ee25a40be28b3e8de48daaef593a34962d6608e78ed094e47
```

Replay reports run `20260905-152059`, 4 conditions × 12 cases, 192 referenced
raw files, 195 manifest entries, and valid raw integrity. The observed summary
is B1 `5/7/0` content and `4/0/8` provenance; B2 `5/7/0` and `4/0/8`; B3
`8/4/0` and `4/0/8`; B4 `6/6/0` and `4/0/8` (pass/fail/unknown). These are
post-hoc computed replay diagnostics only.

## Adversarial fixtures and boundaries

- Manifest relabel (`run=other-run`) with expected `20260905-152059`: rejected
  with `manifest run identity mismatch` (non-zero exit).
- Aggregate binding changed to `run_binding.expected_run_id=other-run`: rejected
  with `aggregate run identity mismatch` (non-zero exit).
- Zero denominator via `metric(0, 0)`: `coverage=null` and `rate=null`.
- One referenced raw file removed: replay exits successfully but emits
  `replay_status=indeterminate`; `frozen_inputs.raw_integrity.status` is
  `indeterminate` and lists the missing path. It is not counted as a pass.
- Referenced raw hash changed in a same-directory manifest copy: rejected
  fail-closed with `raw manifest integrity failure` and one hash mismatch.
- Runtime IDs versus identical content/source, duplicate or mismatched fields,
  ambiguity, conflict/stale, text-vs-envelope, and provider/network prohibition
  sentinels: PASS through `test:offline-eval:v3`.

Historical files in the target worktree remained unchanged (`git status --short`
clean before review artifact creation). No provider, network, retry, or
LLM-as-judge call was made.

## Limitations and claim/evidence boundary

The historical aggregate has no own `run_id`; binding is therefore verified
against the explicit expected run ID and manifest, with an aggregate binding
checked when present. The historical executed source identity remains unknown.
Missing raw evidence yields an indeterminate replay, while missing answer
provenance remains unknown. Free text is scored by a deterministic case rubric,
not semantic human or LLM judging. The replay is post-hoc and retains legacy
scores; it is not a new model run.

Accordingly, this β verdict supports only reproducibility and integrity of the
bounded offline evaluator repair. It provides no evidence that B4 is better
than any baseline, that Prolog improves memory, or that PAM-C1 is established.
Those research claims remain hypothesized/undetermined under `.cdr/POLICY.md`
and require a separately preregistered, controlled future experiment.
