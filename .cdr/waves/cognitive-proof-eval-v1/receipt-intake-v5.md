# Local receipt intake v5 (issue #44)

V5 is forward-only preparation: it rejects v1, v2, v3, and v4 envelopes and does not upgrade historical receipts.

`wire-authority-assembled-prompt-digest-registry-v5.json` pins gamma commit `f24bb217eed0941e4f0fac1e1d4877fe2e81b934`. Its only source hashes are `providers/openai-answering.js` and `trusted-proof-answering.js`. The sealed assembler is bound by its explicit identity (`trusted-proof-preflight.js`) and literal template identities; input mode and exact `temperature`/`top_p` request mapping are registered. The receipt collector and its config template are consumers and are intentionally neither source-pinned nor consulted.

V5 retains P0/P1 proof, prompt and local raw-artifact hashes, duplicate/overwrite, leakage, immutable pair/retry and equal-E gates. Its fixture is synthetic and non-result; no provider, network, model, live raw data, aggregation, effectiveness claim, policy, dataset, oracle, or threshold changes.
