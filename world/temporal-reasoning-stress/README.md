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
npm run preflight:temporal-reasoning-stress
```

The protocol is frozen in
[`protocol.md`](../../.cdr/waves/temporal-reasoning-stress-v1/protocol.md).
No model result exists until a separate frozen P0/P1/P2 collection is run.

Run a new smoke or full collection through the pinned Hermes transport:

```sh
npm run eval:temporal-reasoning-stress -- live \
  --model gpt-5.6-luna \
  --cases trs-d3-chain-seed_fact-positive_to_negative,trs-d8-join-bridge_rule-withdrawal \
  --conditions P0,P1,P2 \
  --out reports/temporal-reasoning-stress-v1/luna-smoke-v1

npm run eval:temporal-reasoning-stress -- live \
  --model gpt-5.6-luna --cases all --conditions P0,P1,P2 \
  --out reports/temporal-reasoning-stress-v1/luna-full-v1
```

Each attempt uses one physical dispatch, no retry, no fallback and no tools.
The report stores the exact prompt, raw adapter evidence, runtime fingerprint,
source snapshot and token usage. `resume` continues only records already absent
from a matching running report and never redispatches an existing attempt path.
