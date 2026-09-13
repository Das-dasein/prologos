# Frozen manifest

This corrected wave was frozen after a deterministic local run on 2026-09-13.
The fixture embeds the authored expectations. Source snapshots preserve the
generator, runner, verifier, test and policy implementation used for the report.

| Artifact | SHA-256 |
| --- | --- |
| `fixture.json` | `b78b92e00d8ea3e1cf5989d5dcfb97549d2b6e94fb7863148b4ffde80557c3fe` |
| `generator-v2.source.cjs` | `708df00a59c7b7dab54584006409b2f0ec866239a43931a81c1cf19583a07f64` |
| `provenance-policy.source.js` | `e54fcfe61953f9c1a3bebcff48fd661241cfe5afeadfc852ac9bccf57c9fa617` |
| `runner-v2.source.cjs` | `e744db276168f502e9c11cbd6e438d3044a1b37c7057a75cc118391bcfa820b2` |
| `test-v2.source.cjs` | `dfae69d97c993e5bfe3e180366693af7385265d58e091ea02f77ca27328b48d4` |
| `verifier-v2.source.cjs` | `2dfe3346fdbd89880052de23583cf78aaad35e0a398a19fba00833a0f13bdf5a` |
| `protocol.md` | `afdc2839210eb6e4dcdd0593d2246377f4215b24ac1dc0c8177b6a6b4013a925` |
| `reports/provenance-policy-ablation-v2/report.json` | `4cdaec8353927c33a1cf429372c7ae41e129ccd83ca4d7b1fec2b21bfd3cbc5a` |

The current verifier replays v1 with its historical decision function and v2
with the corrected raw-conflict ordering. Current package scripts verify v2.
