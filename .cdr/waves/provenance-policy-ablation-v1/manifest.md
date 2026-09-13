# Frozen manifest

This wave was frozen after a deterministic local run on 2026-09-13. The
fixture embeds the authored expectations. Source snapshots preserve the exact
generator, runner, verifier, test, and policy implementation used for the
reported result.

| Artifact | SHA-256 |
| --- | --- |
| `fixture.json` | `95fbdfb265810305e519dc39938efb1b39099b27c7662fc1e953aca61ccba54b` |
| `generator-v1.source.cjs` | `49f6296aa7c18999b47fb31b6cd32de9b769bf19d97c9417d71072438e875e8e` |
| `provenance-policy.source.js` | `e54fcfe61953f9c1a3bebcff48fd661241cfe5afeadfc852ac9bccf57c9fa617` |
| `runner-v1.source.cjs` | `71ff1ad8ddcb1bc170516183981de6cab59a7741f3a70a0cf3c46544e297c74e` |
| `test-v1.source.cjs` | `f4d6aee4a3d3cedbc0722e7dc285d0528b44cf65931213c29833d020aa916d15` |
| `verifier-v1.source.cjs` | `19aae66dfa8198f07cc29478961ebc571b519cbc79320712c66b429747dabd45` |
| `protocol.md` | `71dad1dab9860e35fba9f4b4dfb98a2b13990d43bff616af52e2b33e28f201bc` |
| `reports/provenance-policy-ablation-v1/report.json` | `07a2094c0ae92923b825343d7cbc8936fdf1e7fcc71a7279ea1e6c4cf0e6428f` |

The report verifier also requires the frozen policy source hash to match the
implementation hash recorded by the runner.
