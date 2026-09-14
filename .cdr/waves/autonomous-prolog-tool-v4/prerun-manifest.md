# Autonomous Prolog tool v4 pre-run manifest

Frozen on 2026-09-14 before any v4 model call. Base revision: `d317a47`.

| Artifact | SHA-256 |
| --- | --- |
| `world/autonomous-prolog-tool/generator.cjs` | `96de0628c485be4f69fe93038141ed21d7552b72da1c62ba5c0e92d883b15235` |
| `world/autonomous-prolog-tool/collector.cjs` | `08b6b46de1fc63a1aca306f4ec6eed991d744c829f74652b2298c990d0d2e69c` |
| `world/autonomous-prolog-tool/adapter.py` | `c75c852910b88ca54c40fcbfb7d0fe63a4b5218222f75bcbb3fcbe7fc0670c58` |
| `world/autonomous-prolog-tool/tool_transport_guard.py` | `9131b01cab8b8082424d3183e8166a8aa5ba344a26a7d220764c60d2bb99dc3f` |
| `world/autonomous-prolog-tool/verify-fixture.cjs` | `4ce3c63aa2e7b081b839435f81ad0b0b41996571f33a2bdf70cb639eaaea5afb` |
| `world/autonomous-prolog-tool/collector.test.cjs` | `152d8f1d9259ae0fe8a17706cc074c910b7029cfaf20b46929f925b748a7378f` |
| `world/autonomous-prolog-tool/verify-report.cjs` | `c6df8e75f145269ddb53a3fad298a40d8b56b37eadae502586f9a23bff892de7` |
| `.cdr/waves/autonomous-prolog-tool-v4/protocol.md` | `206d6d34ccf4e76b2a9907bd61448fe3b048cd41917ed863922429e9ea16e3f0` |
| `.cdr/waves/autonomous-prolog-tool-v4/fixture.json` | `59a10bef62f64dad79eb2539a0e17248db7f6783a8eaa660839e8e3bc84c49fc` |

Frozen properties verified before this manifest: 16 unique cases, N/A prompt
byte equality, no tool name in N/A prompt, guided instruction only in G,
byte-for-byte fixture regeneration, and real checker replay after fresh journal
seeding for every case. The planned full wave is 48 cells.

No v4 live model call existed when these hashes were recorded.

## Pre-dispatch bootstrap correction

The first attempted smoke is retained under
`reports/autonomous-prolog-tool-v4/luna-smoke-v1/` with report SHA-256
`e86cf2744be236ff20b80d81944817b2272355eb4829d3a758e6df5f0ea4ac8e`.
All six cells failed locally with `KeyError: ideas_path` before agent creation:
zero inference calls, zero physical dispatches and zero tool calls. It contains
no model result and is excluded from evaluation.

The adapter was corrected to read the already-recorded nested
`world.ideas_path`. No fixture, prompt, condition, scorer, tool schema or
runtime policy changed. The corrected adapter hash is the one in the table
above. No v4 model dispatch existed when this correction was frozen.

## Post-dispatch harness correction

The second attempted smoke is retained under
`reports/autonomous-prolog-tool-v4/luna-smoke-v2/` with report SHA-256
`b6d8d8be6d1ca07910337625af59993e067af159d418249ca5965599f18bb43a`.
All six cells are excluded from evaluation. The provider returned HTTP 200 and
valid terminal message or `function_call` items, but the generic production
conversation loop did not dispatch the normalized tool call and entered its
own invalid-response retry path. The transport guard exposed and stopped those
unplanned retries. Consequently the report contains zero runtime-valid cells
and no completed local tool call.

The adapter now runs the frozen experimental protocol directly over Hermes's
real request builder, Codex stream consumer, response normalizer, tool schema,
and memory-provider dispatcher. This removes the production loop's UI,
persistence and retry policies from the causal surface. It permits exactly one
dispatch, optionally one local query, and one continuation, as the protocol
already specified. It also records response validation and structured
normalization evidence. No fixture, prompt, condition, scorer, tool schema or
solver changed. The post-correction adapter hash is the one in the table above;
it was frozen before the next model dispatch.
