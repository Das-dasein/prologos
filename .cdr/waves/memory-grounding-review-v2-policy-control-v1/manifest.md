# Memory grounding review v2 policy control v1

Frozen before live provider calls. The control measures policy adherence only and has no admission authority.

- 24 one-assertion cases: 10 expected entailed, 13 expected not_entailed, 1 expected uncertain.
- The extraction candidates are synthetic quarantined inputs; this wave does not measure extraction quality.
- The policy and ontology identities are embedded in the fixture and checked by the collector and verifier.
- Live outputs must be written to a new report directory; completed waves are never overwritten.

## Frozen artifacts

- `collector-v1.source.cjs`: `f44a30249e4eda411fac760177b3d4f6487b6c787b192af188d9207e09faa5b7`
- `control.json`: `d622cdb6187e9ace201e5e7e629c2649133a15a52e6a542562d60754dbb369c2`
- `fixture.jsonl`: `fc320b4088f754f595bef3308719f2a970854ae4ea0975e0f12fb66a380a340b`
- `gold.jsonl`: `37f359f40c820ac80e80f4c6b3b550823037e0e981bc9c0f7c298a72fa174f94`
- `grounding-review-v2.source.js`: `8a1b4f2d65ed79f29a769d6c25840d58ed5b4b62629a5d1da9857707006997e4`
- `llm-schema.source.js`: `0e136b1af73a74ff2fed62da652324396cfb292c5925bdd577417b8520a03fb0`
- `memory-grounding-review-v2.schema.json`: `bfe265316ed18cb23b1cc6848a08f6c6e86e30a168d790b7772f4ef0dd4565f6`
- `ontology-registry.source.js`: `465acb06454dd6d6625cd3e296da1aad4a21411fdfdfb39d7232bb00555a6937`
- `predicate-grounding-policy-v1.json`: `2279cae6865da3a406c85c9d8a7d4545db06775c145600fc6062ba49429b05a6`
- `predicate-grounding-policy.source.js`: `5f62c02cddd5c50d15781aea5b0145c12e908662e016ae29d75bf523c18c1040`
- `provider-codex.source.js`: `c9c2fc6d7a6c22b04ddefcb17e98c1ad4bcf556e2ad76f568518faae754e2c8e`
- `verifier-v1.source.cjs`: `96159caabd0ee274623831da75762d03d5ee44359bb1fdb9e5b159d13c944315`
