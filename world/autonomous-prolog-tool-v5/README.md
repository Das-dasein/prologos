# Autonomous Prolog tool v5

This successor to the v4 pilot tests whether Hermes chooses and correctly uses
the repository's real `world_memory_query` tool. It exposes no other tool. In
the optional A condition, the first model turn may issue up to two calls, so a
natural `q` plus `neg(q)` strategy is executed and measured rather than treated
as an infrastructure failure. G remains an exactly-one-call control.

```sh
npm run test:autonomous-prolog-tool-v5
npm run preflight:autonomous-prolog-tool-v5
```

Two-case smoke:

```sh
npm run eval:autonomous-prolog-tool-v5 -- live \
  --model gpt-5.6-luna \
  --cases apt5-d7-chain_of_joins-r4-entailed,apt5-d8-diamond-r4-conflict \
  --conditions N,A,G \
  --out reports/autonomous-prolog-tool-v5/luna-smoke-v1
```

Use `resume` with the identical model and path after interruption. Verify a
terminal report with:

```sh
node world/autonomous-prolog-tool-v5/verify-report.cjs \
  reports/autonomous-prolog-tool-v5/luna-smoke-v1
```
