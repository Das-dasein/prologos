# Temporal receipt ablation v3 pre-run manifest

Frozen on 2026-09-13, before any v3 model call. Base revision: `bc89f82`.

| Artifact | SHA-256 |
| --- | --- |
| `world/temporal-receipt-ablation/generator.cjs` | `312e57c89d7a2b549d04c4445d1f4f56eec21898e80dd7fe00090935ae5b5084` |
| `world/temporal-receipt-ablation/verify-fixture.cjs` | `4800ea9f623d7caf4f6e687fa25c353cfc20843f90be678a7ea1ea5275919935` |
| `world/temporal-receipt-ablation/collector.cjs` | `9d1b8d5f0197ab22b6d33034d246e49ebd8bfc82b047e132f29a75818659cea2` |
| `world/temporal-receipt-ablation/collector.test.cjs` | `6d1af4de1fa333bcbe280673a30f7a91e9125bf80661f76325d2e2f3e250bad3` |
| `world/temporal-receipt-ablation/verify-report.cjs` | `20c29c7650d0459031c7e1447b1ec502b9314ed9dbdc50aad1dc41b533acddee` |
| `.cdr/waves/temporal-receipt-ablation-v3/protocol.md` | `30545110b0b47e5568d88ed79c97ffeb49b8852348fa349e232c771071950775` |
| `.cdr/waves/temporal-receipt-ablation-v3/fixture.json` | `1dea093ca496d8d9fc4fb03a0e2534e65ff558c94e25843bdb9e8b1e4f7cb74f` |

The 32 cases cross depth (7/8), topology (chain/diamond), construction
variant (2/4 revisions, not shown to the model), and final signed status. All
conditions receive precisely the final active snapshot. The only manipulated
input is the receipt payload declared in the protocol.

No v3 model call existed when this manifest was finalized. Regeneration plus
checker replay is required before a live collection.

## Full-run transport correction

The frozen two-case smoke retained at
`reports/temporal-receipt-ablation-v3/luna-smoke-v1/` ended with seven valid
calls and one `L` runtime failure. The failed call made one physical dispatch
and received a streaming HTTP 200 response, but did not reach a provider
terminal event before the transport's slow-response deadline. Its report hash
is `ba975512d12d22c662d0dcce067e6be2483c3875d40b723f0beb622f145c1aa7`.
It is excluded as engineering evidence and will not be silently rescored.

Before any full-run call, only the runtime envelope was widened from 1,024 to
4,096 maximum output tokens and from 120,000 to 240,000 ms. The fixture,
prompts, condition semantics, model, effort, no-tool rule, scorer, one physical
dispatch rule, no-retry rule and no-fallback rule are unchanged. The corrected
collector and verifier hashes are recorded below after final source freeze.
