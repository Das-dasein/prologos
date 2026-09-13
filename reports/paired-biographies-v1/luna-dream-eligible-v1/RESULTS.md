# Luna: conditional dream follow-up

Date: 2026-09-10. This is a separate five-case follow-up to the four-mode
paired-biographies pilot, not an extension of its aggregate table and not an
estimate of a general effect of dreaming.

## Question and condition

The original dataset already marked five records `dream_eligibility.eligible`:
`p01_a`, `p05_b`, `p06_b`, `p07_b`, and `p08_b`. In each, the actual snapshot
has safe status `unknown`, and an authorized question has a positive
counterfactual branch that changes whether the action would be safe.

For each of those records the host performed a fresh `WorldAgent.step` with
strategy `dream`. The model received:

1. the same accepted/candidate memory and host checker receipt as
   `checked_prolog`;
2. a separate conditional receipt containing baseline status and both explicit
   positive/negative assumption branches for the authorized question.

The conditional receipt says that its assumptions are disposable and are not
facts, baseline evidence, or valid `proof_item_ids`. It contains no host
decision object, oracle rationale, expected proof IDs, or expected answer.
The model still had to emit the normal baseline next move and the exact host
checker receipt ID. It had zero tools and one allowed physical provider request.

## Observed result

Model: `gpt-5.6-luna`, reasoning `low`. Dataset and schema hashes equal the
four-mode Luna pilot: `8ced0edd45ca32c3843fcb0a8922a0f3c53635a8c903dedd834a0a86fa39a1e2`
and `e0e151139a9e8805983e271774b6b43a214bc2713e066d0e68bb82990a2a4fd6`.

| Case | Strict result | Observable failure |
|---|---:|---|
| p01_a | correct | — |
| p05_b | correct | — |
| p06_b | correct | — |
| p07_b | incorrect | Question ID, status, reason and checker receipt were correct; `semantic_target` was the Russian question text instead of `available(saffron)`. |
| p08_b | incorrect | Question ID, status, reason and checker receipt were correct; `semantic_target` was the Russian question text instead of `approve(cobalt)`. |

Strict score: **3/5**. All five provider calls have one completed physical
dispatch, zero denied/retried dispatches, no tools, and a completed provider
status. Raw responses, exact prompts, wire bodies, usage, transport records,
fresh dream journals and source snapshots are retained under this directory.

`p07_b` repeats the literal-versus-question-text serialization failure already
observed in the full pilot. `p08_b` adds the same failure surface. Neither case
treated the hypothetical/assistant statement as accepted fact, and neither
invented a negative fact; that is visible in the returned status and empty proof
sets, but this run does not evaluate hidden reasoning.

## Comparison boundary

The old full Luna `checked_prolog` run happened to score 2/5 strict on these
same five rows: `p01_a` and `p06_b` omitted the checker receipt, `p07_b` used
question text as the target, and `p05_b`/`p08_b` were strict-correct. The new
condition scored 3/5, but it has a different prompt, new host checker source
snapshot, and separate model samples. That raw difference is **not** evidence
that counterfactual dreaming improves Hermes or that Prolog helps. It primarily
shows that the fifth condition is runnable and that response serialization is
still a measurable bottleneck.

The appropriate next causal experiment would counterbalance the base checked
condition and this dream condition over fresh repeated samples of these exact
five records, freeze both prompt/source hashes before dispatch, and report every
attempt. That has not been run here.

## Verification

Run, without provider calls:

```sh
node world/paired-biographies/verify-dream-report.cjs
```

The verifier checks source snapshots against current runner sources, report and
evidence hashes, dataset/schema pins, eligible-case selection, one-request/no-
tool transport evidence, and recomputes every strict score from retained raw
responses.
