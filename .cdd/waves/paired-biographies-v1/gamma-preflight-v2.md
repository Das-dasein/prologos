# Gamma pilot preflight — v2

Independent beta confirmed R1–R3 on a fresh copy and approved readiness in
`beta-review-v2.md`: 17 Node tests, 5 transport tests and all 24 gold checks.
The approved dataset hash remains
`8ced0edd45ca32c3843fcb0a8922a0f3c53635a8c903dedd834a0a86fa39a1e2`.

Gamma started the prospective repaired pilot with the existing reviewed runner:

```sh
node world/paired-biographies/run.cjs live --pairs all --extraction all --model gpt-5.6-luna --out reports/paired-biographies-v1/luna-full-review-v2
```

The first actual adapter result, `p01_a/no_memory`, has `status=ok`, Luna on
both wire and provider response, exactly one physical dispatch, zero denied
attempts, no tools, and provider terminal status `completed`. This establishes
the repaired transport's first live integration observation. It is not a
claim about all later calls or model accuracy; final run evidence must be audited.

The report snapshots reviewed sources and pins runtime identity. No configuration,
prompt, gold or scorer changes are allowed during this run. Wrong answers remain
in their denominators; technical failures are preserved. Prior smoke results are
not pooled. The reporting addendum was recorded before this repaired pilot.

This is local execution only, with no commit, release or external action.
Human gold approval and the general CDR benefit claim remain pending.
