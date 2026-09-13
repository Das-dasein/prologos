# Predicate grounding policy v1

The active ontology declares signatures and short meanings, but it did not
define an annotation standard for lexical entailment. This made the earlier
`I mentor junior developers` case undecidable from the declared contract:
`role/2` only said that an entity has a role.

`ontology/predicate-grounding-policy-v1.json` now provides a separate,
content-addressed policy bound to the exact active ontology identity. It states
the default direct-entailment rule, identity-normalization boundary, and
predicate-specific licenses and exclusions. It does not change the ontology,
historical prompts, frozen reports, or admission behavior.

Policy v1 licenses a stable habitual role verb as a role statement. Therefore
`I mentor junior developers` supports `role(user,mentor)`. The prior extraction
gold label (`ontology_candidate`) and grounding-review label (`not_entailed`)
were not justified by the ontology available at annotation time.

The hash-bound post-hoc correction changes the interpretation of earlier
metrics without rewriting them:

- Product extraction v4 becomes 16/16 decision and semantic exact, with zero
  harmful eligible writes under this policy.
- Grounding review becomes 13/16 verdict exact and gains one blocked entailed
  assertion.
- In the retrospective hybrid set, validator v2 alone passes 7/9 clean and 0/4
  harmful candidates; review alone passes 8/9 clean and 2/4 harmful; their
  conjunction passes 6/9 clean and 0/4 harmful.

This correction reduces the apparent benefit of semantic review. The policy
was authored after the old outputs, so these adjusted figures remain post-hoc.
A future review contract must include the policy identity in every output, and
a fresh wave must freeze the policy before annotation and model calls.

Artifacts:

- Policy identity: `conversation_grounding@1.0.0`
- Policy SHA-256: `c012e2b9ca0f571d226076656324f62dc6919059dd2b342c94cb09b5782d402f`
- Policy file SHA-256: `2279cae6865da3a406c85c9d8a7d4545db06775c145600fc6062ba49429b05a6`
- Adjudication SHA-256: `c456068b119815c5fd8f1c2c4958020991ebe126c0188e0daafabd4a1bfa9919`

Replay:

```bash
node test-predicate-grounding-policy.js
node adjudicate-predicate-grounding-policy-v1.cjs \
  reports/predicate-grounding-policy-v1/adjudication.json
```
