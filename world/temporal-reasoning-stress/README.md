# Temporal reasoning stress v1

This module generates a frozen 36-case benchmark that combines multi-step
signed-Horn inference with persistent-memory revision. Cases span 3, 5 and 8
rule applications, chains and conjunction joins, changed facts and changed
rules, and replacement in either direction or withdrawal.

Every episode admits an origin assertion and a dependent mirror copy, changes
the origin, reconstructs `WorldAgent` from its journal, and asks for the final
status plus the exact active support IDs. Neutral amber/cobalt route names are
deterministically remapped across cases so a branch name does not reveal the
answer. The generator gets its oracle from the real checker and verifies a
no-dependency ablation.

Generate to a new path and verify byte-for-byte regeneration:

```sh
npm run generate:temporal-reasoning-stress
npm run test:temporal-reasoning-stress
```

The protocol is frozen in
[`protocol.md`](../../.cdr/waves/temporal-reasoning-stress-v1/protocol.md).
No model result exists until a separate frozen P0/P1/P2 collection is run.
