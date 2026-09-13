# Extraction plus grounding end-to-end v1

Twelve new messages were frozen before any output: four direct registered
facts, four durable facts requiring unregistered predicates, two clear pronoun
antecedents, and two ambiguous or missing antecedents. Each message received
one v4 extraction call; the six resulting `write` candidates then received one
hash-bound semantic review. The run completed 18 provider calls, retained 54
raw artifacts, and performed zero admission writes.

The extractor selected the expected decision in 12/12 cases. The primary frozen
semantic score is 11/12 because the gold used `kendzi` for `Кэндзи`, while the
candidate used `kenji`. The experiment had not specified a transliteration
standard. A separate post-hoc adjudication accepts `kenji` without changing the
original report; under that adjudication extraction semantics and review
verdicts are both 12/12 and 6/6 respectively.

No harmful `write` candidate occurred in this fresh wave, so it does not verify
the retrospective safety gain from semantic review. Validator v2 blocked both
correct clear-pronoun writes. Semantic review accepted both, but the conjunctive
hybrid necessarily retained the v2 blocks. Its final result is therefore 10/12
with zero harmful writes and two missing correct writes. Adding review to the
product now would add a model call without improving this fresh end-to-end
outcome, so it remains an experimental CDR layer with no admission authority.

The immutable live report SHA-256 is
`68e4c08f78d3cb848d9013f349cdeeb87f4f33a4986a46d8beae556e2ce59f5e`;
the adjudication SHA-256 is
`a3241894fdd49010e9e301f652cf16795bc32411d656402c07ca39526514b0ad`.
The run used 352668 input tokens, including 247552 cached input tokens, and 3700
output tokens from retained Codex JSONL envelopes.

Replay locally:

```bash
node verify-extraction-grounding-e2e.cjs \
  reports/extraction-grounding-e2e-v1/luna/report.json \
  .cdr/waves/extraction-grounding-e2e-v1/fixture.jsonl \
  .cdr/waves/extraction-grounding-e2e-v1/gold.jsonl

node adjudicate-extraction-grounding-e2e.cjs \
  reports/extraction-grounding-e2e-v1/luna/report.json \
  reports/extraction-grounding-e2e-v1/luna/adjudication-v1.json
```
