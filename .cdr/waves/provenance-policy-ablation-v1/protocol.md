# Provenance policy ablation v1

## Question

Which authored recorded-provenance attack is rejected when the deterministic
action gate advances from safe proof alone to group disjointness, host
attestation, and lineage disjointness?

## Frozen design

The fixture contains 11 synthetic checker results. Each result is evaluated by
four policies with threshold two:

1. `safe`: act on safe entailment;
2. `group_v1`: require disjoint fact source groups;
3. `attested_v2`: additionally require every fact group to be host-attested;
4. `lineage_v3`: additionally require disjoint recorded upstream lineages.

The manually authored expected matrix is stored in `fixture.json`. It includes
independent lineages, copied publishers, model and host-declared self-splitting,
mixed trust, duplicate items, missing lineage, one support path, and
unknown/conflict/contradicted controls. The runner makes no model or network
calls and does not write to a world journal.

## Claim boundary

Exact replay establishes that the implementation matches this finite policy
contract. It does not show that lineage metadata is true, that a connector can
discover hidden copying or collusion, that sources are reliable, or that the
policy improves an LLM or a real task.

Run:

```sh
npm run test:provenance-policy-ablation
```
