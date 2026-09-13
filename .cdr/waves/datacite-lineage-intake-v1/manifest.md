# Frozen manifest

The public DataCite responses were retrieved on 2026-09-13. Descriptors retain
the precise UTC retrieval times. `raw-sha256.txt` lists all 14 response files;
each filename is also the SHA-256 of its exact bytes.

| Artifact | SHA-256 |
| --- | --- |
| `raw-sha256.txt` | `4e85cd8eb6606028695d8f76b07b80088937c47e0bf43619442f943ef4d750d3` |
| `protocol.md` | `056a1dfbb37ec7d5bb9153124b6e357869e8c26d9bdd4887736b6bf8fb33b772` |
| `datacite-lineage-v1.source.js` | `4ca3f37a7352eae6dfe7395ace592a4a3352f4f6429465963345d0a39a773804` |
| `datacite-lineage-cli-v1.source.cjs` | `c413beb253f5de80adab77e14f1a16407ed00a787249ed0fb2170410ac8fb587` |
| `datacite-lineage-verify-v1.source.cjs` | `ec0cbc3a14253e84755de62b55aa132ae980a7ee40f2d325f3b9c2b882884b61` |
| `datacite-lineage-e2e-v1.source.cjs` | `6941f176cc5d2cbdd633597406bca424f4e9cff8c441aec5698f5c6f69a6349a` |
| `datacite-lineage-e2e-verify-v1.source.cjs` | `8492becc2b3e164a1195deac6fd29f665b528b2a71c0384375c2b74cdec5a715` |
| `datacite-lineage-test-v1.source.js` | `99eeca97a5984ea9f5ea3a5a13fd084596c0fec796f21fefb76064de2a0bc989` |
| `reports/datacite-lineage-intake-v1/live-v47.json` | `11fd085a2a50a10e03f87c458460d5058666e4470611609cd97d48aae2bbef92` |
| `reports/datacite-lineage-intake-v1/live-dryad.json` | `96347ecb6eccc05d3255c3b9e75e60c93db41e6a3363a572f404712231c31e9a` |
| `reports/datacite-lineage-intake-v1/world-e2e.json` | `fc11e60f3d9b5c3c13eeeb9aad5718bd1a38946072b5ce19573de8fe64f2b4c5` |

The live descriptor verifier re-hashes and reparses every response named by a
descriptor. The E2E verifier then rebuilds both world-policy scenarios from the
frozen descriptors.
