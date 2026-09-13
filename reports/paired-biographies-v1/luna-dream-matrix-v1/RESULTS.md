# Luna: counterbalanced dream matrix

Date: 2026-09-10. This report tests a small, pre-specified representation
comparison. It is not evidence that dreaming improves an agent in general.

## Fixed protocol

The matrix contains exactly the five authored `dream_eligibility.eligible`
records: `p01_a`, `p05_b`, `p06_b`, `p07_b`, `p08_b`. Each appears twice under
each condition, for 20 fresh installed-Hermes calls in total:

| Condition | Inputs beyond the shared accepted/candidate memory | Calls |
|---|---|---:|
| `checked_prolog` | Host checker receipt for the baseline snapshot | 10 |
| `checked_prolog_dream` | The same checker receipt plus labelled positive/negative disposable-assumption branches | 10 |

Repetition 1 orders base then dream for every case; repetition 2 reverses that
order. Each cell uses a fresh process/journal, zero tools, one allowed physical
request and no retry. The source snapshot, exact prompt, raw response, wire
body, usage, transport evidence and journal are retained for every cell.

The two conditions are deliberately **not equal-information**: the dream
receipt provides host-computed counterfactual branches. It excludes the host
decision, oracle rationale and expected answer, and explicitly says a branch
assumption cannot be used as baseline evidence or a proof item.

## Results

Model: `gpt-5.6-luna`, reasoning `low`. All 20 cells have exactly one completed
physical dispatch, zero denied/retried dispatches, zero tools, and a completed
provider result.

| Surface | checked_prolog | checked_prolog_dream |
|---|---:|---:|
| Strict JSON/move/proof/receipt contract | 5/10 | 6/10 |
| Decision surface | 6/10 | 8/10 |

The secondary decision surface was implemented before dispatch. It keeps the
kind, formal target, reason, status, question ID and proof constraints strict;
it relaxes only a **sole** checker-receipt wire mismatch. It does not repair a
wrong target, status, question or proof.

The ten matched repetition/case comparisons are heterogeneous:

- `p01_a`: tie in repetition 1; base had literal-text failure and dream had a
  receipt omission in repetition 2.
- `p05_b`: base won in repetition 1 because dream emitted question text;
  tie in repetition 2.
- `p06_b`: base won strictly by a one-character receipt typo in repetition 1;
  dream won in repetition 2 because base emitted question text.
- `p07_b`: dream won in repetition 1 because base had a receipt typo; both
  emitted question text in repetition 2.
- `p08_b`: tie in repetition 1; dream won in repetition 2 because base emitted
  question text.

With ties excluded, the pre-specified exact two-sided sign check has 2 base
wins versus 3 dream wins on the strict surface (`n=5`, `p=1.0`) and 1 versus 3
on the decision surface (`n=4`, `p=0.625`). These are descriptive checks on
the ten matched cells, not a basis for significance or a positive result.

These are output-serialization failures. The matrix does not inspect hidden
reasoning and does not license an inference that the conditional branches
caused the observed count difference. With five selected synthetic cases and
two repetitions, there is no statistical basis for a benefit claim. The useful
negative finding is narrower: the proposed sleep condition is executable and
auditable, but formal literal/receipt serialization remains a larger measured
source of variance than the present sample can separate from condition effects.

## Reproduce verification

This performs no model calls:

```sh
node world/paired-biographies/verify-dream-matrix.cjs
```

It checks all source and evidence hashes, dataset/schema pins, counterbalanced
plan, fresh replay strategy, one-request/no-tool transport constraints and
recomputes every strict score from the retained raw output.
