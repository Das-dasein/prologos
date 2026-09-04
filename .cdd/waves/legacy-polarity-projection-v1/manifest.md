# CDD wave: legacy-polarity-projection-v1

**Related issue:** #14

## Objective

Make the legacy preference extraction contract emit one canonical proposition
with explicit polarity, so the assertion core can observe an explicit
positive/negative conflict.

## In scope

- remove `dislikes` from the legacy relation allowlist;
- add the bounded `likes/2` polarity rule to shared extraction instructions;
- prove a synthetic pizza proposal creates an observable direct conflict.

## Out of scope

- generic antonym interpretation, LLM accuracy claims, data migration,
  conflict resolution, registry evolution, and CDR results.
