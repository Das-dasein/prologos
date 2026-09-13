# CDR wave manifest: paired-qualifier-repair-v1

Status: `completed-development-run; final assisted extraction 24-of-24`.

This wave follows the syntax-repair result without consulting gold. A
deterministic provenance validator checks candidate source identity and time,
explicit support for non-default interval endpoints, interval order and
replacement references. On the frozen syntax-repaired outputs it selects only
`p05_b`: candidate `itema1` assigns `validTo:19`, but its cited source states
that the old rule begins at tick 1 and is indefinite; 19 appears only as an
inference from the replacement beginning at 20. Runtime retirement is already
represented by `itema3.replaces=itema1`.

One model call receives the candidates, dialogue, extraction contract and the
deterministic diagnostic. It may change only fields named by diagnostics. No
gold candidate, admission or behavior oracle is supplied. The result remains a
candidate and is rescored by the unchanged extraction scorer.

The completed Luna call changed only `itema1.validTo` from `19` to `null` and
scored the remaining case exact. Together with the prior syntax-repair wave,
the assisted pipeline reaches 24/24 on this synthetic development corpus. The
original first-pass score remains 16/24.

```sh
node --test world/paired-biographies/qualifier-validator.test.cjs world/paired-biographies/qualifier-repair.test.cjs
node world/paired-biographies/qualifier-repair.cjs offline
node world/paired-biographies/verify-qualifier-repair.cjs reports/paired-biographies-v1/luna-qualifier-repair-v1
```
