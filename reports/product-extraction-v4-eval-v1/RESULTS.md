# Product extraction v4 evaluation v1

> **Later contract correction:** the frozen gold labelled `I mentor junior
> developers` as `ontology_candidate`, but the ontology did not specify whether
> a habitual role verb licenses `role/2`. Predicate-grounding policy v1 now
> explicitly licenses it. Under that post-hoc policy adjudication, this report
> is 16/16 rather than 15/16. See
> [the correction](../predicate-grounding-policy-v1/RESULTS.md); the primary
> report and original score remain unchanged.

This fresh control froze 16 cases before the live run: four expected `write`,
four `ignore`, four `clarify`, and four `ontology_candidate`. Luna completed all
16 isolated calls. The run retained 48 raw prompt/stdout/stderr artifacts and
performed zero admission writes.

The explicit decision was correct in 15/16 cases (93.75%). All four `ignore`
and all four ambiguous `clarify` cases were correct. All four registered writes
were semantically exact. Three of four unknown relations became ontology
candidates.

The sole error was `I mentor junior developers.`. The model emitted
`role(user, mentor)` as a `write` instead of proposing an unregistered mentoring
relation. That is a real harmful normalization error, and validator v2 allowed
it. The result therefore does not support automatic admission even though the
four-way decision contract improved observability.

Validator v2 also rejected both correct clear-antecedent writes (`Priya ...
She` and `Илья ... Он`). A post-hoc validator-v3 replay permits those two cases
by requiring exactly one preceding capitalized antecedent mention, while still
blocking the ambiguous writes in the earlier 12-case control. On the new v4
wave it blocks zero correct writes, but it still allows the `role(user, mentor)`
error. This replay is diagnostic only because validator v3 was authored after
the outputs were known; selectivity requires another fresh control.

The live report SHA-256 is
`90697e6a5156d121c2d569fc99f1dea3dfdd094335b1350b2696643e1a1ec1cf`.
The v4 validator-v3 replay SHA-256 is
`60450b4d4819abca7f77a75ab6c10d8575c8e048c612566ec6df016ca407cec9`.
The run used 316334 input tokens, including 76800 cached input tokens, and 3203
output tokens as reported by the Codex JSONL envelopes.

Replay the sealed report without provider calls:

```bash
node verify-product-extraction-v4-eval.cjs \
  reports/product-extraction-v4-eval-v1/luna/report.json \
  .cdr/waves/product-extraction-v4-eval-v1/fixture.jsonl \
  .cdr/waves/product-extraction-v4-eval-v1/gold.jsonl

node product-extraction-validator-v3-replay.cjs \
  reports/product-extraction-v4-eval-v1/luna/report.json \
  .cdr/waves/product-extraction-v4-eval-v1/fixture.jsonl \
  .cdr/waves/product-extraction-v4-eval-v1/gold.jsonl \
  reports/product-extraction-v4-eval-v1/luna/validator-v3-replay.json
```
