# Gamma CDR scaffold — issue #72: contaminated Codex v9 diagnostic

## Immutable artifact status

`/Users/artem/Documents/prologos-live/codex-v9-run-20260906-134714`
remains an authentic v9 transport artifact, SHA-256
`3ca3314446c13af468237d5f5641ab2915aa3a4e638f47c800ab658bbcef0212`.
Its prior raw-integrity validation remains true.

It is now classified as **contaminated diagnostic material** for answering
quality or P0/P1 interpretation because the answering Codex agent had
read-only tool access to the host repository/memory.

## Observed contamination

- P0: commands in 10/12 attempts, 25 completed commands; hidden answer
  contract present in tool output in 8/12 attempts.
- P1: commands in 3/12 attempts, 10 completed commands; hidden answer
  contract present in tool output in 2/12 attempts.
- `temporal_conflict_01/P1` reads the current dataset case and receives
  `expected_result`, `expected_conflict`, and `hidden_answer_contract`.

The raw trace is not hidden chain-of-thought. It consists of observable
messages, tool events and final constrained answers. P1's supplied Prolog
proof/missing-goal material remains visible in its submitted prompt.

## Required interpretation

The artifact may demonstrate collector transport, raw evidence binding,
native counter retention and the presence of observable tool contamination.
It may not demonstrate response quality, P0/P1 usefulness, Prolog effect,
token cost of prompt material, causal behavior, or model comparison.

## Future repair requirements

Before a future paid run, prove an execution boundary in which the answering
model receives only the sealed prompt and cannot read the repository, user
memory, dataset/evaluator contracts, raw artifacts, or shell tools. Test
actual denied reads, not merely a prompt instruction. Preserve raw JSONL so
the absence/presence of any tool event is auditable.

No rerun, provider call, AST work, revised scorer or effectiveness claim is in
this cycle.
