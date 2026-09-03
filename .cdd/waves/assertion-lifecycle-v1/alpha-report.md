# Alpha report: assertion-lifecycle-v1

## Verdict

**PASS for the bounded engineering slice.** This is not a claim that the
epistemology, ontology quality, or LLM reflection quality has been proven.

## Verified

- `assertion/2` is separated from polarity, modality, time, source and
  confidence.
- Lifecycle statuses and allowed transitions are executable Prolog facts.
- An unresolved positive/negative conflict remains observable but blocks
  `safe_assertion/2` and derived domain conclusions.
- Reflection proposals are schema-validated and checked against diagnostics
  and existing assertion IDs.
- No write occurs without explicit approval.
- Approved changes append `assertion_revision/3` or a status event; the source
  journal is not rewritten.

## Commands

```text
npm test
npm run test:cdr-gold
git diff --check
```

Result: all commands passed at commit `4a083b7`; CDR gold pilot remained
12/12. The CDR result is a symbolic gate and does not establish live-model
reflection quality.

## Limitations

- Identity aliases are still review-only and are not automatically normalized.
- Legacy assertions use `accepted` as a migration default until reviewed.
- The lifecycle is not yet independently beta-audited.
- `active_claims` remains a historical field name in CDR result artifacts.
