# Alpha R2: live candidate collector

Implemented `trusted-proof-live-candidate.js`. Its default invocation makes zero provider calls.

`node trusted-proof-live-candidate.js --provider openai-api --allow-live-provider --config /absolute/config.json --model MODEL --root /fresh/absolute/root`

It produces local raw prompt/response evidence and a v3 candidate integrity receipt only after all 12 P0/P1 pairs pass equality checks. This alpha ran only injected fake-client tests: no key, network call, raw live output, or effectiveness claim was made.

Self-coherence: `node test-trusted-proof-live-candidate.js` validates the fake 24-record bundle through the pinned v3 validator and exercises no-receipt gates. Debt: a fresh CDR beta must replay the command path with its own environment; integrity is not an effectiveness result.
