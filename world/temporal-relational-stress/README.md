# Temporal relational stress v2

This is the planned successor to `temporal-reasoning-stress-v1`. V1 showed that
isolated 3/5/8-step routes remain too easy for a formal-memory model condition.
V2 adds cross-entity binary relations, interacting and conflicting proof paths,
multiple interleaved revisions and a flattened-final-snapshot control.

The preregistered design is in
[`protocol.md`](../../.cdr/waves/temporal-relational-stress-v2/protocol.md).
The deterministic generator and frozen 32-case fixture now exist. No model
collector or result exists yet.

Generate to a new path and verify the retained fixture by exact regeneration
and an independent SWI replay of every active snapshot:

```sh
npm run generate:temporal-relational-stress
npm run test:temporal-relational-stress
```
