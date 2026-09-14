# Prolog receipt transport v6 pre-run manifest

Frozen on 2026-09-14 before any v6 model call. Base revision: `ce71929`.
Runtime fingerprint:
`a00cac42469c082fddd02c2a34814b183bee9ebade9ae536c495c742b2fe6d60`.

| Artifact | SHA-256 |
| --- | --- |
| `world/prolog-receipt-transport-v6/generator.cjs` | `f9679c24bccbe2845da1f3d36e5cbbf33979045a252b74a8ca864a95ad65fc87` |
| `world/prolog-receipt-transport-v6/collector.cjs` | `1397e10c6b27e01e19b535c48522113611845a8e11bf675e67cad4485fe03347` |
| `world/prolog-receipt-transport-v6/adapter.py` | `5c9a276827fd85c01e29d1a9ca961ec80fb5f68573091f4ac82f32b2a09be42d` |
| `world/prolog-receipt-transport-v6/tool_transport_guard.py` | `9131b01cab8b8082424d3183e8166a8aa5ba344a26a7d220764c60d2bb99dc3f` |
| `world/prolog-receipt-transport-v6/verify-fixture.cjs` | `fb9f8c99d4623d3f367dd2bca45c94f8d29011483c66a1fe56c9964f0099eef4` |
| `world/prolog-receipt-transport-v6/collector.test.cjs` | `d0822bd6d6ff369785f3db85eda3ba416127664174f3d2b4fee87d07d76bc57f` |
| `world/prolog-receipt-transport-v6/test_adapter_helpers.py` | `2186f48a8f3374c1dc30cd463f97d4557856b4e123356da52a3cca3e45bdedc5` |
| `world/prolog-receipt-transport-v6/verify-report.cjs` | `9fc85ee6164c703a6839a1ef5aa12b7a432e800fdec0bd857cd2b7bca2bd3de7` |
| `.cdr/waves/prolog-receipt-transport-v6/protocol.md` | `90973aa3628d8481c8ace26d56e9413dc0d1e558cfd1ed17a8e011e72a33e547` |
| `.cdr/waves/prolog-receipt-transport-v6/fixture.json` | `d020aae0ec760411256beafcd9d15fbd9e9efdd50c878782ae9c2be29442c456` |

The fixture verifier passed all 16 cases, including byte-identical R/C prompts,
deterministic fixture regeneration, and real checker replay after fresh journal
seeding. Collector tests cover both transports, exact one-call/two-dispatch
runtime enforcement, independent raw and delivered receipt checks, and report
replay. The compact-projection helper has a separate regression test. The
offline preflight declares 32 planned cells.

V6 was motivated by the verified terminal v5 full run at
`reports/autonomous-prolog-tool-v5/luna-full-v1/`, report SHA-256
`bf4771a11565f5646993fe8ae804c2cd6eb0d62bbfd2f81fbc7019399c9715f2`.
That run showed six downstream provenance failures despite correct primary
checker receipts. V6 changes only how that receipt is transported back to the
model: R delivers the existing raw receipt and C delivers a deterministic
target-only compact projection. Prompt, tool schema, query, solver, model,
settings and call count remain fixed.

No v6 live model dispatch existed when this manifest and its hashes were
recorded.
