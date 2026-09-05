# Local receipt intake v4 (issue #42)

V4 is a forward-only preparation format. It rejects v1, v2, and v3 envelopes;
no historical receipt is upgraded or reinterpreted.

`sampling-wire-assembled-prompt-digest-registry-v4.json` is self-hashing and
pins PR #41 merge `97df020eeffd83df9eaaec4608056046a8ff6198`, hashes of the
OpenAI transport, answering adapter, candidate collector, and immutable config,
literal no-wrapper template identities and input mode. It binds the exact
sampling object: only `temperature` in `[0,2]` and `top_p` in `[0,1]`, mapped
respectively to `responses.create.temperature` and `responses.create.top_p`.
The registry rebuilds sealed P0/P1 digests without provider construction,
network use, prompts/raw bytes, scoring, aggregation, thresholds, or results.

V4 retains the inherited P0/P1 proof, local artifact/hash, duplicate/overwrite,
leakage, immutable-pair/retry/equal-E, source/registry self-hash gates. The
committed fixture is synthetic and non-result. The existing v3-labelled
collector is intentionally not changed and must fail v4 until a later CDD
change updates receipt emission and binding.
