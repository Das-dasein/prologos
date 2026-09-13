# Product extraction v4/v5 paired control v1

Frozen before live provider calls. The same 20 messages are evaluated under v4 and policy-bound v5 with alternating condition order.

- Gold: 11 write, 8 ignore, 1 clarify.
- Planned provider calls: 40; memory/admission writes: 0.
- v5 validator eligibility is computed only on an explicit v4 projection for diagnosis; the actual product admission validator rejects v5.
- Completed records are append-only and an explicit resume reuses the sealed prefix.

## Frozen artifacts

- `builder-v1.source.cjs`: `a8ef4e35ed8e25268e48f66585e0a5bbc32dcdd32affea4193431dcf28b63999`
- `collector-v1.source.cjs`: `351680986d7feb13a2c4db28800115c9d91838674cd25497408e097be6c66286`
- `control.json`: `7e3192e0de5cbd4df8a56395fc08eeaac37dcb7e7838a26c647b13eec204c092`
- `extraction-admission-v2.source.js`: `21d3e7bc79e4e68ed389042fdfe5e96cf8361501d4bdf491d45dbccfe11fb8b2`
- `fixture.jsonl`: `3be7ff6e8bbbcc4cde8f47b6b912ef69aacb8e7898a891fdd5d981474fd1a9f9`
- `gold.jsonl`: `a0468d73b9d768bcccfa01eb7b5c2abd87fe36bbeb1ebee041268c776020d62f`
- `llm-schema.source.js`: `a29067821befaf8ab16085269e631fb1f366ab625af30b51264a865fb3d9b487`
- `memory-extraction-v4.schema.json`: `a4984b4cb7ffe20e3fc2878ed1a3ce8f917e6c5d7ece0662b1853fa21c62b116`
- `memory-extraction-v5.schema.json`: `0874795457f3fd79924c1361499f5a9006588f095d64256ea4f1e3ea68ea4d8e`
- `ontology-registry.source.js`: `465acb06454dd6d6625cd3e296da1aad4a21411fdfdfb39d7232bb00555a6937`
- `predicate-grounding-policy-v1.json`: `2279cae6865da3a406c85c9d8a7d4545db06775c145600fc6062ba49429b05a6`
- `predicate-grounding-policy.source.js`: `5f62c02cddd5c50d15781aea5b0145c12e908662e016ae29d75bf523c18c1040`
- `provider-codex.source.js`: `ae4810bfa1a56c010ac3ad7e128458ccdc4e711866cad5b655fcf704592d8a66`
- `verifier-v1.source.cjs`: `d7835bb540def4e1f0c0c47025140f03abb0dc342fba5a74350dbc6b5be4dc3c`
