# Local candidate report: ProverQA hard hybrid r3

Status: `candidate-observed-not-a-cdr-receipt`.

This is one local Codex-subscription run, not a CDR α claim and not a
replication. Its raw evidence remains local and ignored by Git at
`raw-codex-mini-r3-20260907/`; that directory contains no `auth.json` after
collection.

## Bound run

- Model: `gpt-5.4-mini` through locally authenticated `codex exec`, not the
  OpenAI API.
- Fixture: 12 deterministically selected ProverQA `dev/hard` cases, pinned to
  source SHA-256 `79428ef614d43729ce82e4d065055fdc6a39abad0f20cb226c5288fc315468e4`.
- P0/P1: no native command or tool event permitted.
- P2: exactly one sealed, no-argument SWI-Prolog broker action permitted.
  The broker evaluates only one predeclared Horn-chain subgoal; quantifiers
  and non-Horn operators remain model work.

## Observed counts

| Condition | Recorded | Protocol-valid | Correct among valid | Note |
| --- | ---: | ---: | ---: | --- |
| P0 | 12 | 12 | 7 (58.3%) | original natural-language world |
| P1 | 12 | 12 | 6 (50.0%) | lossless Prolog-term carrier, no solver |
| P2 | 12 | 10 | 6 (60.0%) | one bounded SWI broker call required |
| P2-hybrid quantified subset | 6 | 5 | 4 (80.0%) | subset only; one P2 protocol failure |

P2 cases `proverqa-hard-213` and `proverqa-hard-267` are protocol-invalid,
not wrong answers: the model made respectively three and four broker actions
where r3 allowed exactly one. They are excluded from the P2 valid denominator
and were not retried.

## Interpretation boundary

The source answer is benchmark gold, not a locally verified complete FOL
oracle. The tiny one-run result cannot establish a Prolog advantage: P2 has a
different valid denominator, no independent repetition, and the hybrid subset
was selected before collection. It establishes only an execution fact: in
valid P2 records Codex performed the actual SWI call and a separately recorded
private broker receipt exists. In r3, `BROKER_RESULT` was redirected to that
private file and did not appear in native command `aggregated_output`; the raw
evidence therefore does not show that the model received or used the solver
result. The next transport revision must emit the bounded result to both the
receipt and the model-visible command output.
