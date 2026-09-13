# Temporal receipt ablation v3 pre-run manifest

Frozen on 2026-09-13, before any v3 model call. Base revision: `bc89f82`.

| Artifact | SHA-256 |
| --- | --- |
| `world/temporal-receipt-ablation/generator.cjs` | `312e57c89d7a2b549d04c4445d1f4f56eec21898e80dd7fe00090935ae5b5084` |
| `world/temporal-receipt-ablation/verify-fixture.cjs` | `4800ea9f623d7caf4f6e687fa25c353cfc20843f90be678a7ea1ea5275919935` |
| `world/temporal-receipt-ablation/collector.cjs` | `c0b9fecdf254c7c307975f84e8d9db2b89b73dfc4f4d700cafca9b52f88f144e` |
| `world/temporal-receipt-ablation/collector.test.cjs` | `6d1af4de1fa333bcbe280673a30f7a91e9125bf80661f76325d2e2f3e250bad3` |
| `world/temporal-receipt-ablation/verify-report.cjs` | `0d23f63632294526bdc8bc6507a54a80b444b3d3181ec7c8d596016c94c2acf3` |
| `.cdr/waves/temporal-receipt-ablation-v3/protocol.md` | `30545110b0b47e5568d88ed79c97ffeb49b8852348fa349e232c771071950775` |
| `.cdr/waves/temporal-receipt-ablation-v3/fixture.json` | `1dea093ca496d8d9fc4fb03a0e2534e65ff558c94e25843bdb9e8b1e4f7cb74f` |

The 32 cases cross depth (7/8), topology (chain/diamond), construction
variant (2/4 revisions, not shown to the model), and final signed status. All
conditions receive precisely the final active snapshot. The only manipulated
input is the receipt payload declared in the protocol.

No v3 model call existed when this manifest was finalized. Regeneration plus
checker replay is required before a live collection.
