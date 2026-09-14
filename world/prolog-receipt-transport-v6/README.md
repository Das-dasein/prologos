# Prolog receipt transport v6

This wave isolates how the same real `world_memory_query` result is transported
back to the model. R returns the existing verbose raw checker receipt. C returns
a deterministic compact projection containing only the query, four-way status,
and target/opposite minimal support sets. Prompt, tool schema, solver, query,
model, call count, and continuation budget are identical.

```sh
npm run test:prolog-receipt-transport-v6
npm run preflight:prolog-receipt-transport-v6
```

Two-case smoke:

```sh
npm run eval:prolog-receipt-transport-v6 -- live \
  --model gpt-5.6-luna \
  --cases prt6-d7-chain_of_joins-r4-entailed,prt6-d8-diamond-r4-conflict \
  --conditions R,C \
  --out reports/prolog-receipt-transport-v6/luna-smoke-v1
```

Use `resume` with the identical model and path after interruption. Verify a
terminal report with:

```sh
node world/prolog-receipt-transport-v6/verify-report.cjs \
  reports/prolog-receipt-transport-v6/luna-smoke-v1
```
