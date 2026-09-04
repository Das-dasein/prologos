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

The final patch also rejects unreconciled provider usage totals (`total_tokens != input_tokens + output_tokens`) with `USAGE_MISMATCH`; the focused suite was rerun after this patch and remains green.

## Fix round R1

### Gap

β findings F-1–F-4 are repaired within the γ clarification scope: the harness CLI is usable and explicit, prompt identity is bound to the named deterministic template, the provider/raw-output boundary is opt-in and local-only, and deterministic CI is shipped. CDR datasets, oracles, thresholds, methods, and claims remain untouched.

### Skills

The previously loaded CDD/CDS alpha, issue/design/plan, engineering code/test/TypeScript/CLI skills remain the governing set. This fresh α session reloaded Git artifacts only and did not use the first α session as authority.

### ACs

F-1: `parseArgs` rejects unknown/missing options with usage and exit 2; tracked `test-fixtures/live-extraction-cli.jsonl`, config, and output artifact provide a positive subprocess path. F-2: `PROMPT_TEMPLATE_NAME` and `PROMPT_TEMPLATE` define the pin; `prompt_sha256` must match the template and each record carries `assembled_prompt_sha256`; matching and mismatch tests are present. F-3: only `fake` and `openai-api` are accepted; `openai-api` requires both provider flag and `--allow-live-provider`, with adapter require/client construction after the gate; fake raw output is written only to explicit non-overwriting local paths and referenced, not embedded. F-4: `.github/workflows/deterministic.yml` runs locked Node tests for push/PR without secrets or provider calls.

### Self-check

Focused and full test evidence: `node test-live-extraction.js` → `live-extraction ok: 15 assertions`; `npm test` → all suites green; `npm run test:cdr-gold` → `cdr gold harness ok`; `git diff --check` → clean. CLI negative subprocess exits 2, prints usage, and contains no stack trace; positive subprocess writes one artifact. No network/provider invocation was made. Affected peers were re-enumerated: CLI callers are `test-live-extraction.js` and the documented shell entrypoint; raw-output writer is called only by `runHarness`; provider modules remain unchanged and openai adapter loading is gated; workflow calls only npm scripts. Existing schema/profile and MemoryStore boundaries remain unchanged.

### Debt

The openai-api adapter remains deliberately unexecuted in α and its provider usage contract is not synthesized: an opt-in live run must still supply reviewable usage/raw behavior and a separate β decision. No live credentials, raw live output, CDR artifact, registry mutation, durable-memory write, or quality claim was produced. GitHub-hosted CI status is pending the remote workflow run.

### CDD Trace

R1. Receive: fresh α repair dispatch from `gamma-clarification.md`, scoped exactly to F-1–F-4.
R1. Produce: explicit parser, deterministic prompt pin/assembled hash, fixed provider allowlist and gates, local raw-output reference writer, tracked fixtures/tests, and minimal CI workflow.
R1. Prove: focused subprocess positive/negative tests, full regression, CDR gold check, diff check, and no-network/no-secrets inspection passed locally. Changes are ready for fresh β re-review; α does not author β/γ artifacts, merge, or close.

## CDD Trace

1. Receive: accepted issue #17 and γ dispatch on `cycle/17`; verified checkout and read the gamma scaffold and wave contract.
2. Produce/design: bounded additive no-write harness plan recorded above; design/plan separate files are not required for the explicit reason above.
3. Prove/constraints: active v2 schema, ontology identity, CDR policy/method, and all producer/consumer peers enumerated.
4. α Gap: absent auditable extraction boundary identified.
5. α Skills: Tier 1/2/3 loaded and listed above.
6. α Artifacts: `live-extraction-harness.js` adds config/dataset preflight, provider adapter boundary, v2 validation, normalized result and local artifact writer; `test-live-extraction.js` adds deterministic fake fixtures for valid, malformed, stale identity, leakage, usage and budget paths; `package.json` registers the focused suite. Caller path is `test-live-extraction.js` lines 10-12 and 35-75. No existing provider, CDR data, oracle, threshold, registry, or trusted memory surface changed.
7. α Self-coherence: `node test-live-extraction.js` output is `live-extraction ok: 11 assertions`; `npm test` output is green for all six suites; `git diff --check` is clean. `git diff --stat origin/main..HEAD` is enumerated by the three implementation files plus this report and the four gamma scaffold files; role identity is verified by `git log -1 --format='%H %an <%ae>'` → `6601cdf... alpha <alpha@prologos.cdd.cnos>` (and each alpha commit uses the same identity). Branch remains `cycle/17`, fetched from origin; no rebase was needed because the branch has not drifted behind `origin/main`. This is the α handoff boundary; beta/gamma artifacts are not authored here.
