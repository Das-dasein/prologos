# α dispatch: representation-live-evaluator-v1

Work in a fresh α session. Read the adjacent `gamma-spec.md`, the CDR
representation manifest, and the existing generator/provider conventions.

Implement only the pinned live evaluator and fake-provider tests. Do not make
network calls, do not use a real API key, and do not implement P2. Preserve
the baseline's hard rule: P0/P1 live v1 accepts only the OpenAI Responses
transport with no tools; a provider receives only a sealed prompt string.

Return a commit SHA, changed paths, focused-test and `npm test` results, and
limitations. Do not create a CDR claim or receipt.
