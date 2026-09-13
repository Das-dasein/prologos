# Extraction admission policy v2

Product extraction and repair now default to `memory-extraction-v5` under the
content-addressed policy `product_extraction_admission@2.0.0`, identity SHA-256
`27efe662f73d0fca7f1d7c45853bb2c88373205ee9a2f914529bdd8c102a251e`.
The policy accepts only v5 candidates and binds predicate-grounding policy
`conversation_grounding@1.0.0` plus the same deterministic validator pipeline
tested before activation:

1. schema, evidence, and interval checks;
2. conservative third-person pronoun validation v2;
3. non-ASCII identity binding v1.

Codex and OpenAI product providers use the v5 prompt and schema for primary
extraction and repair. A v5 receipt binds policy v2. Admission verifies all
candidate and source hashes, resolves the policy from the receipt, checks that
the candidate schema belongs to that policy, and replays its validators before
an explicitly approved write.

Compatibility is preserved. V4 receipts bind and replay immutable admission
policy v1. Historical receipt v1 continues to replay legacy validator v2. The
active policy therefore cannot silently change the result of an older receipt.

Activation evidence consists of the frozen 20-case paired v4/v5 control and the
fresh 16-case Russian identity control. V5 improved exact disposition and
candidate output from 11/20 to 19/20, but both versions produced one harmful raw
identity write. On the separate identity control, the deterministic gate
removed all five harmful eligible writes and blocked none of ten correct writes.
This supports the combined v5-plus-gate product path on these bounded controls;
it does not establish general extraction quality, multilingual entity
resolution, or CDR.

Artifacts:

- Policy file SHA-256: `221721c0d00ebd7533e8ee47689e2601c7bdef9300d2d7440a48e99d24edec26`
- Policy identity SHA-256: `27efe662f73d0fca7f1d7c45853bb2c88373205ee9a2f914529bdd8c102a251e`
- Grounding policy SHA-256: `c012e2b9ca0f571d226076656324f62dc6919059dd2b342c94cb09b5782d402f`
- Paired control: `reports/product-extraction-v4-v5-paired-control-v1/RESULTS.md`
- Identity control: `reports/product-extraction-v5-identity-control-v1/RESULTS.md`
- Activated product smoke: `reports/product-extraction-v5-product-smoke-v1/RESULTS.md`

Checks:

```bash
node test-product-extraction-v5-contract.js
node test-extraction-admission-policy.js
node test-extraction-admission.js
node test.js
```
