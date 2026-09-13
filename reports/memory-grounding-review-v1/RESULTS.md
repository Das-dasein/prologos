# Memory grounding review v1

> **Later contract correction:** the frozen gold treated `I mentor junior
> developers` as not entailing `role(user,mentor)`, although the active ontology
> did not define that restriction. Predicate-grounding policy v1 explicitly
> licenses stable habitual role verbs. See
> [the correction](../predicate-grounding-policy-v1/RESULTS.md). The primary
> numbers below remain the immutable original scoring.

Thirteen retained extraction candidates containing 16 assertions were frozen
before fresh review calls. They include directly entailed assertions, three
predicate-coercion errors, and two ambiguous-pronoun errors. Each review is
bound to the candidate hash, covers every assertion index once, retains an exact
source span, and has no admission authority.

Luna classified 14/16 assertions correctly (87.5%) and 11/13 candidate gates
correctly under the original gold. It rejected `mentor` coerced to `role`, plus
two `joined` events coerced to `works_at`. It blocked zero originally labelled entailed
assertions. It nevertheless marked both ambiguous-pronoun assertions as
`entailed`, so semantic review alone passed two harmful candidates.

A retrospective conjunction with deterministic validator v2 separates the
failure modes on this candidate set:

- Validator v2 passed 6/8 clean candidates and 1/5 harmful candidates.
- Semantic review passed 8/8 clean candidates and 2/5 harmful candidates.
- The hybrid passed 6/8 clean candidates and 0/5 harmful candidates.

This is evidence that the two layers catch different observed errors. It is not
yet evidence for deploying the hybrid: the candidate set is retrospective, the
review prompt was authored after observing extraction failures, and extraction
plus review has not been measured together on fresh inputs. Product admission
therefore remains validator-v2-only and explicitly approved by the user.

The live review report SHA-256 is
`e154232975de116e0c75094825213b04b71bc8af694f18d801b7643b34f7e720`;
the hybrid replay SHA-256 is
`0703e1a81f6183f474de55abd8d583c57aafa9ec87798432d2999a6f02b226a3`.
The 13 review calls used 250313 input tokens, including 54528 cached input
tokens, and 1909 output tokens from retained Codex JSONL envelopes. No memory
write occurred.

Replay locally:

```bash
node verify-grounding-review-eval.cjs \
  reports/memory-grounding-review-v1/luna/report.json \
  .cdr/waves/memory-grounding-review-v1/fixture.jsonl \
  .cdr/waves/memory-grounding-review-v1/gold.jsonl

node grounding-review-hybrid-replay.cjs \
  reports/memory-grounding-review-v1/luna/report.json \
  .cdr/waves/memory-grounding-review-v1/fixture.jsonl \
  .cdr/waves/memory-grounding-review-v1/gold.jsonl \
  reports/memory-grounding-review-v1/luna/hybrid-replay.json
```
