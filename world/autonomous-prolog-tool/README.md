# Autonomous Prolog tool v4

This wave tests whether Hermes chooses and correctly uses the repository's real
`world_memory_query` tool. It exposes no other tool.

```sh
npm run test:autonomous-prolog-tool
npm run preflight:autonomous-prolog-tool
```

Two-case smoke:

```sh
npm run eval:autonomous-prolog-tool -- live \
  --model gpt-5.6-luna \
  --cases apt4-d7-chain_of_joins-r4-entailed,apt4-d8-diamond-r4-conflict \
  --conditions N,A,G \
  --out reports/autonomous-prolog-tool-v4/luna-smoke-v1
```

Use `resume` with the identical model and path after interruption. Verify a
terminal report with:

```sh
node world/autonomous-prolog-tool/verify-report.cjs \
  reports/autonomous-prolog-tool-v4/luna-smoke-v1
```
