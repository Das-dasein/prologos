# Temporal relational stress v2

This is the planned successor to `temporal-reasoning-stress-v1`. V1 showed that
isolated 3/5/8-step routes remain too easy for a formal-memory model condition.
V2 adds cross-entity binary relations, interacting and conflicting proof paths,
multiple interleaved revisions and a flattened-final-snapshot control.

The preregistered design is in
[`protocol.md`](../../.cdr/waves/temporal-relational-stress-v2/protocol.md).
The deterministic generator, frozen 32-case fixture and four-condition model
collector now exist. No model result exists yet.

Generate to a new path and verify the retained fixture by exact regeneration
and an independent SWI replay of every active snapshot:

```sh
npm run generate:temporal-relational-stress
npm run test:temporal-relational-stress
npm run preflight:temporal-relational-stress
```

Run a new smoke through the pinned Hermes transport:

```sh
npm run eval:temporal-relational-stress -- live \
  --model gpt-5.6-luna \
  --cases trv2-d4-chain_of_joins-r2-entailed,trv2-d7-diamond-r4-conflict \
  --conditions P0,P1,P1F,P2 \
  --out reports/temporal-relational-stress-v2/luna-smoke-v1
```

Status accuracy is scored independently from JSON validity and support-set
serialization. Each attempt uses one physical dispatch, no retry, no fallback
and no tools. Existing attempt paths are never redispatched by resume.
