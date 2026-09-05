# β review: offline evaluator v3 schema gate

Date: 2026-09-05. Reviewer: fresh independent CDR/CDS β. Reviewed the
immutable target commit `a0306c7faf5ebc44aa1a301e489e43abb1e7cb42`
(`a0306c7`). Scope was limited to `validate-offline-eval-v3.js`, its
`package.json` script, `docs/offline-eval-v3.md`, and the checked-in offline
replay schema/artifact. No provider, network, or LLM call was made.

## Verdict

`GO` for the bounded engineering schema-gate scope. The checked-in valid
`replay-v3-r2.json` is accepted, an unexpected top-level field is rejected,
and the required tests pass in a clean archive pinned to the exact target
SHA. This is not evidence for PAM-C1, model quality, or B4 superiority.

## Clean-copy reproduction

The clean copy was created from the exact target commit; `node_modules` was
copied only as a local test dependency:

```sh
clean=$(mktemp -d /tmp/offline-eval-v3-beta.XXXXXX)
git archive a0306c7 | tar -x -C "$clean"
cp -R node_modules "$clean/node_modules"
```

Observed target SHA:

```text
a0306c7faf5ebc44aa1a301e489e43abb1e7cb42
```

Required commands in that clean copy:

```text
npm run test:offline-eval:schema  PASS
npm run test:offline-eval:v3     PASS (offline-eval-v3 sentinels)
npm test                          PASS (all listed suites)
```

The schema command reported both the positive replay check and
`additional property rejected` negative check.

## Boundary checks

- Default artifact path resolved to
  `reports/live-20260905-152059/replay-v3-r2.json` and passed.
- An explicit temporary copy of that valid replay passed, confirming the
  positional artifact path is honored while the schema remains rooted at the
  validator module directory.
- An explicit temporary copy with `__unexpected_schema_field: true` failed
  with a Zod `unrecognized_keys` error and non-zero exit.
- The older `replay-v3.json` was rejected when passed explicitly because it
  lacks the newer required `run_binding` and `replay_status` fields. This is a
  useful fail-closed result; the default points at the schema-compatible
  `replay-v3-r2.json`.

The validator uses the checked-in `schemas/offline-eval-v3.schema.json` and
the pinned project `zod@4.5.4` dependency. The schema forbids unexpected
top-level keys. The documentation describes this as an engineering schema
check and explicitly says it is not evidence for PAM-C1; no research result
claim was found in the added documentation.

## Limitations and claim boundary

This review exercises schema parsing and the deterministic negative fixture;
it does not establish semantic correctness of every unconstrained object
field, historical model quality, or clinical/research effectiveness. The
schema gate does not itself validate raw-manifest hashes, evaluator replay
logic, or provider isolation beyond the separately run offline sentinels.
Those remain bounded engineering checks and not evidence that B4 improves
answers or that PAM-C1 is established.
