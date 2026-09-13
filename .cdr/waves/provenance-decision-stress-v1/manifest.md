# Provenance decision stress v1 manifest

The fixture and protocol were frozen before collector implementation and before
any live model dispatch. This wave was superseded without a provider call after
the seed date defect was found. The corrected v2 wave must be used for runs.
Any run must use a fresh output directory and retain
every provider request, response, native usage record, and process result.

| Artifact | SHA-256 |
| --- | --- |
| `fixture.json` | `ae5065e6cafec718ace9fa74e626e279f8e740fda6e7a7901ee64566fe938ffe` |
| `generator-v1.source.cjs` | `c64dac10ee3fcc9a1d37bf1235c596477d1326fa6e32b0d84ea2651442f588ab` |
| `generator-test-v1.source.cjs` | `0f04eb395fb923bf53b543b1eef9866fa4868f2bab00e9cf954d85bfcfec201f` |
| `checker-js.source.js` | `16f239a2d45c12bfc4e3f49d4980b1176fb604a88fe3d434af37efcbbd03038d` |
| `checker-pl.source.pl` | `f4094b368111bdf1b0b35643e751d99ea6772d0e7095f61d3a9c5671fc79bc15` |
| `collector-v1.source.cjs` | `80b1f41030ebdb6f1967fd4f00a38979afe02984e8828bf7ae6c37aedfcf846f` |
| `collector-test-v1.source.cjs` | `c04ac75a7809417e55f147bc88a0151b048404b0b3139f40feb6b488d8c94a3a` |
| `verifier-v1.source.cjs` | `c087521716f13a95193f7d72cd61c8dde032f1328333387783b9fbe4829a68db` |
| `hermes-runner.source.cjs` | `7684a61869e758165ae3cfb37329c180c6808563d62a0cd800f7b0210fe6c789` |
| `hermes-harness.source.cjs` | `d2e604817827406d3f4eb8bff222f5181ba87a961eb99f2773deeb4f16fb6ced` |
| `hermes-adapter.source.py` | `8d206771be0bd7b67f0082235f5c292e0cef57556fbe0225c97f1920319e8600` |
| `transport-guard.source.py` | `36553cc0706f8a77bec794744135be42cfa7275f184a479b6a9c491820428d03` |
| `runtime-info.source.py` | `b341d9be2f4ce3325637f22a86972ec0f992302c2d654c52bffd9fe2bd0273d7` |

The fixture is deterministic from `generator-v1.source.cjs`. Its oracle is
recomputed by `world/checker.js` and the frozen decision policy; no model output
was used to author case labels.
