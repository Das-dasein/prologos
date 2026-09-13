# CDR wave manifest: extracted-memory-e2e-v1

Status: `completed-deterministic-development-replay`.

Question: when the retained Luna extraction candidates are processed by the
real journal, admission validator, active snapshot, signed-Horn checker and
next-step policy, do the bounded repair stages alter the resulting decision?

The two lanes use the same 24 authored cases and no new model calls. `first`
uses the original extraction response. `assisted` uses the exact first response
for successful cases, the frozen syntax-repair response for its seven exact
repairs, and the qualifier-repair response for `p05_b`. All three source report
hashes are pinned before replay.

Each candidate is proposed separately. Actual user assertions are admitted only
after runtime validation; reported and uncertain items remain candidates.
Invalid candidates remain rejected and cannot support a proof. The comparison
scores checker raw/safe status and the complete deterministic next move.

Observed development result: first 17/24, assisted 24/24; seven decisions
change to the authored result. This establishes a causal effect of the retained
repairs inside these fixed episodes. It does not establish general extraction,
admission, memory or model superiority.

The authoritative v2 replay normalizes the nondeterministic hexadecimal SWI
stream address in retained syntax-error messages. It does not alter admission,
checker output, decisions or scores. The unnormalized v1 run is preliminary.

```sh
node world/paired-biographies/extracted-memory-e2e.cjs reports/paired-biographies-v1/extracted-memory-e2e-v2
node world/paired-biographies/verify-extracted-memory-e2e.cjs reports/paired-biographies-v1/extracted-memory-e2e-v2
```
