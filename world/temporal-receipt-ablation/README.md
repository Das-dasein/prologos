# Temporal receipt ablation v3

This frozen wave holds temporal projection constant and separates model-only
logic (`L`), status-only receipt transport (`V`), support-ID-only transport
(`S`), and full receipt transport (`F`). See the preregistered decision rules
in `.cdr/waves/temporal-receipt-ablation-v3/protocol.md`.

Verify fixture regeneration, checker replay, collector behavior, and the
128-call plan:

```sh
npm run test:temporal-receipt-ablation
npm run preflight:temporal-receipt-ablation
```

Run a frozen two-case smoke (eight calls):

```sh
npm run eval:temporal-receipt-ablation -- live \
  --model gpt-5.6-luna \
  --cases rav3-d7-chain_of_joins-r2-entailed,rav3-d8-diamond-r4-conflict \
  --conditions L,V,S,F \
  --out reports/temporal-receipt-ablation-v3/luna-smoke-v1
```

Verify a terminal report independently:

```sh
node world/temporal-receipt-ablation/verify-report.cjs \
  reports/temporal-receipt-ablation-v3/luna-smoke-v1
```

Use `resume` with the same model and output path after interruption. Existing
attempt directories are never redispatched if their record was not committed.
For a full wave, replace `--cases ...` with `--cases all` and use a new output
directory. A receipt condition measures transport, not a general Prolog
advantage; only `L` measures model-only inference on this synthetic fixture.
