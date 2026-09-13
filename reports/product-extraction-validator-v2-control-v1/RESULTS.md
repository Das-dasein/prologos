# Validator v2 fresh control

Twelve cases were frozen after the first pronoun miss and before these model
outputs. They include explicit subjects, one-antecedent coreference,
multi-antecedent ambiguity, reported speech, hypothetical language, a question,
and conjunctions. `gpt-5.6-luna` received one source turn per call. All 12 calls
completed, 36 prompt/stdout/stderr artifacts were retained, and no candidate
was admitted.

| Metric | Result |
|---|---:|
| Write/no-write boundary | 10/12 (83.3%) |
| Exact semantic case | 9/12 (75.0%) |
| Validator-v2 eligible | 8/12 (66.7%) |
| Harmful writes still eligible | 0 |
| Correct exact writes blocked | 1 |
| Clarify cases producing writes | 2/3 |
| Ontology candidates | 3 |

The aggregate `correct exact writes blocked` count is one because `coref-05`
also included an unnecessary ontology candidate, making the whole case
non-exact. At assertion level, the gate blocked both correct one-antecedent
resolutions:

- `Alex joined the project. He uses Python.` → `uses(alex,python)`;
- `Maria joined the project. She uses Java.` → `uses(maria,java)`.

It also blocked both observed ambiguous resolutions:

- `Alex met Jordan. He uses Python.` → `uses(alex,python)`;
- `Maria met Sofia. She uses Java.` → `uses(maria,java)`.

Thus the fresh control confirms the safety effect but falsifies the idea that
validator v2 is selective enough to resolve coreference. A blanket pronoun
block cannot distinguish one explicit antecedent from multiple compatible
antecedents. It may remain fail-closed, but it should not be described as a
semantic coreference solution.

The report SHA-256 is
`716dab4ddae32beff78693d7c6ee6d7b75dba01273ec00889e890e7903123659`.
This authored 12-case control is still not a population estimate, and exact
coreference labels reflect the frozen conservative annotation policy.

Verify all scores and raw artifact hashes locally:

```sh
node verify-product-extraction-v3-control.cjs \
  reports/product-extraction-validator-v2-control-v1/luna/report.json \
  .cdr/waves/product-extraction-validator-v2-control-v1/fixture.jsonl \
  .cdr/waves/product-extraction-validator-v2-control-v1/gold.jsonl
```
