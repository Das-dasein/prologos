# Product extraction v4 coreference control v1

These fresh cases were frozen before output: four clear named antecedents, four
ambiguous named antecedents, four pronouns without a named antecedent, and four
explicit non-pronoun writes. Luna completed all 16 calls, retained 48 raw
artifacts, and performed zero admission writes.

The v4 decision was correct in 14/16 cases. All eight ambiguous or missing
antecedent cases produced `clarify`, and none produced a write. Two of four
clear-antecedent cases were also over-clarified. Together with the four explicit
controls, six of eight expected writes produced `write`.

Only 12/16 cases were semantically exact. Two clear-antecedent candidates added
unsupported `works_at` assertions from `joined the team` and `joined Acme`.
These are predicate-grounding errors, not coreference errors.

The fresh comparison rejects validator v3 as the product gate. Validator v2
allowed 14/16 candidates and zero harmful writes. Validator v3 allowed 15/16,
but the newly eligible `cv3-01` candidate contained unsupported
`works_at(leila, team)`. Validator v3 also treated the organization `Acme` as a
second possible antecedent in `Mary Jane joined Acme`, showing that capitalization
counts do not provide entity typing. The product alias therefore remains on
validator v2; validator v3 is retained only as a failed research candidate.

The report SHA-256 is
`41228b12ff32fc91f0eb6bbfb4b20ba98810b3f67c56a25ad9ba02eabc05ff12`.
The run used 316324 input tokens, including 134400 cached input tokens, and 3399
output tokens from the retained Codex JSONL envelopes.

Replay without provider calls:

```bash
node verify-product-extraction-v4-coref-control.cjs \
  reports/product-extraction-v4-coref-control-v1/luna/report.json \
  .cdr/waves/product-extraction-v4-coref-control-v1/fixture.jsonl \
  .cdr/waves/product-extraction-v4-coref-control-v1/gold.jsonl
```
