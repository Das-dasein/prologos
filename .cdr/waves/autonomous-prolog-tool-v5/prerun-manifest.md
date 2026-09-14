# Autonomous Prolog tool v5 pre-run manifest

Frozen on 2026-09-14 before any v5 model call. Base revision: `5212b0f`.
Runtime fingerprint:
`a00cac42469c082fddd02c2a34814b183bee9ebade9ae536c495c742b2fe6d60`.

| Artifact | SHA-256 |
| --- | --- |
| `world/autonomous-prolog-tool-v5/generator.cjs` | `b082b02d3e95d2c34ec3aaf32b44b676f299c687b92c7f98e6f31890cbf752bd` |
| `world/autonomous-prolog-tool-v5/collector.cjs` | `e0f20c24399f3b4d77259bd3be7fa1833f9a33f0b60674cc933530a187342c69` |
| `world/autonomous-prolog-tool-v5/adapter.py` | `676b6e8baddd9e26c49072c42dc1b1a481d18e4667841449939e6974bf67342c` |
| `world/autonomous-prolog-tool-v5/tool_transport_guard.py` | `9131b01cab8b8082424d3183e8166a8aa5ba344a26a7d220764c60d2bb99dc3f` |
| `world/autonomous-prolog-tool-v5/verify-fixture.cjs` | `cbcc71c4361cefd0add21e2140177c61c3df6152e22f4438f4f04e37087a1518` |
| `world/autonomous-prolog-tool-v5/collector.test.cjs` | `ee9443827ee50b89288a5cb51efeefae95e52b98cb3d987bedc6e55e1577e431` |
| `world/autonomous-prolog-tool-v5/verify-report.cjs` | `c1c9efac7f5a131d018873ea5e8e62d6f0cc89b6fc039d2005eef6725c5f959f` |
| `.cdr/waves/autonomous-prolog-tool-v5/protocol.md` | `15c4f796f31cae8ac0e675d95a6be65063eb306f4a50874398b4c5f9d52d3038` |
| `.cdr/waves/autonomous-prolog-tool-v5/fixture.json` | `3fcfa8dedc54a8bd09643143a3e94237a535a9b38e380f6beab161d1f9826269` |

The fixture verifier passed all 16 cases: byte-identical N/A prompts, no tool
name in those prompts, guided instruction only in G, deterministic fixture
regeneration, and real checker replay after fresh journal seeding. Collector
tests cover no-call A, two-call A, rejection of a third call, rejection of two
calls in G, scoring of primary and complementary queries, and independent
report replay. The offline preflight declares 48 planned cells.

V5 was motivated by the verified terminal v4 pilot at
`reports/autonomous-prolog-tool-v4/luna-smoke-v3/`, report SHA-256
`8c36fb4ec4bc4406d3d4b30101e5dc752f4d031eca4209ca03604aeae8a137ff`.
No v5 live dispatch existed when this manifest and its hashes were recorded.
