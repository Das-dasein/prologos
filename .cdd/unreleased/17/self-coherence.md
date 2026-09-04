## Gap

Issue #17, mode `design-and-build`, branch `cycle/17`. Gamma artifact of record: [gamma-scaffold.md](gamma-scaffold.md), with the wave contract in `live-extraction-harness-v1/{manifest.md,gamma-spec.md,alpha-dispatch.md}`. The selected gap is the absent provider-independent, no-write harness for auditable turn-level `memory-extraction-v2` runs. This alpha cell implements the CDS boundary only; it does not produce a CDR extraction result.

Implementation plan: design and plan artifacts are not required as separate files because the gamma scaffold and wave specification already provide the bounded design, impact surfaces, AC oracle, and ordered contract for this additive single-module harness. The implementation order is: (1) preflight/config and dataset boundary, (2) fake-provider execution and v2 validation, (3) normalized local result serialization/CLI, (4) focused deterministic tests, (5) regression and gate audit.

## Skills

Tier 1: CDD loader, `CDD.md`, CDD alpha, CDS loader, `CDS.md`, CDD issue/design/plan. Tier 2: `eng/code`, `eng/test`. Tier 3: `eng/typescript`, `eng/ux-cli` (the implementation is CommonJS JavaScript but crosses typed JSON/config and CLI boundaries). Sources were loaded from the paths named in alpha dispatch, in order.

## ACs

Initial contract mapping before implementation. AC1: new harness validates each provider output with the active `memory-extraction-v2` schema and returns records without importing/calling `MemoryStore`. AC2: assembled prompt/context leakage checks reject private markers and stable-01 gold ID/proposal before adapter invocation. AC3: config/result metadata pins source commit, dataset/profile/provider/model/prompt/sampling/retry and requires reported usage within budget. AC4: deterministic fake fixtures cover valid, malformed, stale identity, leakage, and budget failures with stable normalized output. AC5: live provider capability remains explicit opt-in and local-only; no live call is made by tests. AC6: existing deterministic commands remain unchanged. Evidence: `node test-live-extraction.js` passed with `live-extraction ok: 11 assertions`; this covers AC1-AC5, and `npm test` passed all existing suites plus the focused suite for AC6.

## Self-check

The proposed surface keeps the harness independent from durable-memory and registry writers, and records failures as local result rows rather than converting them to research claims. No ambiguity is intentionally delegated to beta: provider invocation, identity, prompt leakage, usage evidence, budget, and output schema boundaries are stated as deterministic checks. Remaining judgment is limited to later CDR interpretation.

Peer enumeration before code: provider adapters `{providers/codex.js, providers/openai-api.js}` — exempt, because the harness consumes an injected adapter and does not alter either adapter; extraction-envelope producers/consumers `{llm-schema.js, memory-store.js, schemas/memory-extraction.schema.json, chat.js, providers/codex.js, providers/openai-api.js}` — audited, no contract edits; active profile/registry `{ontology-registry.js, ontology/active-profile-v1.json, ontology/registries/*}` — audited, immutable; CDR writers/readers `{cdr-annotation-harness.js, cdr-eval-harness.js, .cdr/results/*, .cdr/datasets/*}` — exempt by explicit no-dataset/oracle/result mutation; provider fixtures/tests `{test-fixtures/fake-codex.js, test.js, test-registry-ingestion.js}` — audited, new focused fake tests will be additive. Harness/schema-bearing producers and consumers are therefore explicitly enumerated before implementation.

Post-implementation self-check: the diff adds only the harness, its fake-only focused test, and the test script registration. The new module caller is `test-live-extraction.js` (calls `runHarness`, `createFakeProvider`, and `writeRunArtifact`); the CLI entrypoint is explicit `--provider fake`. Claims in this report are backed by the test runner output and source diff; no claim about model quality is made.

## Debt

Known debt: no real-provider adapter is wired into this harness CLI; live execution remains deliberately out of scope for alpha and must be separately reviewed. Cross-condition budget equality and CDR scoring remain CDR #5/#7 responsibilities. No live provider run, raw live output, CDR dataset/oracle/threshold/claim edit, trusted-memory write, registry mutation, beta/gamma artifact, or quality claim was produced.

## CDD Trace

1. Receive: accepted issue #17 and γ dispatch on `cycle/17`; verified checkout and read the gamma scaffold and wave contract.
2. Produce/design: bounded additive no-write harness plan recorded above; design/plan separate files are not required for the explicit reason above.
3. Prove/constraints: active v2 schema, ontology identity, CDR policy/method, and all producer/consumer peers enumerated.
4. α Gap: absent auditable extraction boundary identified.
5. α Skills: Tier 1/2/3 loaded and listed above.
6. α Artifacts: code/tests will be named here after diff exists; no existing provider, CDR data, oracle, threshold, registry, or trusted memory surface is to be changed.
7. α Self-coherence: this report is being authored incrementally before code; AC evidence, test output, post-patch audit, diff enumeration, and role identity evidence will be appended before review-readiness.
