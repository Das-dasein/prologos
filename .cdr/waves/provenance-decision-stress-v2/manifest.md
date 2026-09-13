# Provenance decision stress v2 manifest

The corrected fixture, protocol, generator, collector, verifier, checker, and
Hermes transport sources are frozen before live dispatch. New runs use a fresh
output directory and retain every request, response, native usage record, and
process result. Resume never redispatches an attempt directory that already
exists without a committed report record.

| Artifact | SHA-256 |
| --- | --- |
| `fixture.json` | `6aeb1c9021bfea99dbfe13e25fbec46fb54c7d6f21fbf963d136380a58692b24` |
| `generator-v2.source.cjs` | `7c41fb08fefd6da337128d1d239dfc5bc77b34ba10e34a3c269ffbf8bb1799b4` |
| `generator-test-v2.source.cjs` | `0f04eb395fb923bf53b543b1eef9866fa4868f2bab00e9cf954d85bfcfec201f` |
| `collector-v2.source.cjs` | `a618e89fbc0df776ef30a0f3d1c05b834dec031a597eb5a60faed2fd4032fffd` |
| `collector-test-v2.source.cjs` | `c04ac75a7809417e55f147bc88a0151b048404b0b3139f40feb6b488d8c94a3a` |
| `collector-v2.0.1.source.cjs` | `c399a916b355f14c0077c8b8ab9302203696208af3c457eba5332158bfa4bad9` |
| `collector-test-v2.0.1.source.cjs` | `957275feaad3abe52a26bef97795a04f7a75e01b50fc51b0ff5509e477f7fb1b` |
| `verifier-v2.source.cjs` | `862c7cad73259a106c705a0902a0517699013c99455591a965e2a433cf6b91f6` |
| `checker-js.source.js` | `16f239a2d45c12bfc4e3f49d4980b1176fb604a88fe3d434af37efcbbd03038d` |
| `checker-pl.source.pl` | `f4094b368111bdf1b0b35643e751d99ea6772d0e7095f61d3a9c5671fc79bc15` |
| `hermes-runner.source.cjs` | `7684a61869e758165ae3cfb37329c180c6808563d62a0cd800f7b0210fe6c789` |
| `hermes-harness.source.cjs` | `d2e604817827406d3f4eb8bff222f5181ba87a961eb99f2773deeb4f16fb6ced` |
| `hermes-adapter.source.py` | `8d206771be0bd7b67f0082235f5c292e0cef57556fbe0225c97f1920319e8600` |
| `transport-guard.source.py` | `36553cc0706f8a77bec794744135be42cfa7275f184a479b6a9c491820428d03` |
| `runtime-info.source.py` | `b341d9be2f4ce3325637f22a86972ec0f992302c2d654c52bffd9fe2bd0273d7` |

The oracle is recomputed by SWI-Prolog and the frozen decision policy. No model
output was used to author labels. V1 is retained as superseded pre-dispatch
evidence with zero provider calls.
