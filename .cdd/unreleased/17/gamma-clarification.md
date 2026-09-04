# Gamma clarification: repair round R1 for issue 17

Date: 2026-09-05.
Authority: γ=δ after independent β R1, commit
`3b094f58fcb0b1c4589df8b8f4dcff4bb0916bd1`.

## Decision

Preserve issue #17 AC5. Do not weaken the live-provider/local-output boundary
to fit the fake-only first implementation. Fresh alpha repairs only F-1 through
F-4 below; it does not run a provider, alter CDR evidence, or broaden into an
answer/baseline experiment.

## Repair contract

1. **CLI contract (F-1).** Replace the broken parser with an explicit parser.
   A valid fake invocation must use a tracked fixture/config and write one
   local run artifact. Missing/invalid options print documented usage, return
   exit 2 and no stack trace. Add subprocess-level tests.
2. **Prompt pin (F-2).** Treat `config.prompt_sha256` as the SHA-256 of one
   named, deterministic extraction prompt template. The harness must compare
   the configured value to that template before adapter invocation. Each
   turn's rendered prompt hash is recorded separately as
   `assembled_prompt_sha256`; neither value may be invented. Matching and
   mismatching fixtures are required.
3. **Opt-in adapter and raw local output (F-3).** Add only a fixed provider
   allowlist: `fake` and `openai-api`. The latter requires both
   `--provider openai-api` and `--allow-live-provider`, and must refuse before
   SDK/client construction when either gate is absent. No arbitrary module,
   command or user-supplied executable provider is allowed. A provider response
   may carry raw output; on opt-in runs the harness writes it only under an
   explicit local `--raw-output-dir`, with non-overwriting paths. Raw output,
   API credentials and live config are ignored/untracked; tests use a fake
   adapter and assert the local raw-output path/contents without calling a
   network. Parsed records retain a reference/path and never embed raw output.
4. **CI evidence (F-4).** Add a minimal GitHub Actions Node workflow that
   installs locked dependencies and runs the declared deterministic test suite
   for pushes and pull requests. It must not call a provider or read secrets.

## Invariants

- Existing v2/profile validation, prompt leakage preflight-before-adapter,
  no-write boundary, dataset/oracle/threshold immutability and fake-only test
  execution remain binding.
- Alpha records each F-1--F-4 repair in a new self-coherence fix-round section,
  re-runs all affected checks, and updates the caller/peer enumeration for the
  CLI, raw-output writer and workflow.
- A fresh beta re-review is required; this clarification is not a verdict.

## Repair R2: β-R2 findings

Authority: independent β-R2, commit
`8324a9e053184b7ee9750756c48457f5301ce192`.

1. **OpenAI evidence adapter.** Keep the existing application-facing
   `extractMemory` compatibility path, but add a harness-facing adapter result
   that returns parsed v2 output, provider-reported input/output/total token
   usage, and raw completion output. The harness maps the provider's native
   usage fields into its normalized three-field contract and rejects missing or
   unreconciled values. The selected model must be explicit and match the run
   config; do not silently substitute a default model in an opt-in run.
2. **Raw-output gate.** `--provider openai-api` additionally requires a
   non-empty `--raw-output-dir` before the OpenAI adapter/client is created.
   The CLI must fail with usage/exit 2 if it is absent. Fake fixtures may prove
   local raw-writing behavior without network access.
3. **Hosted CI prerequisite.** The deterministic workflow installs the
   non-interactive SWI-Prolog package before any test invoking the Prolog
   engine. Retain locked Node installation and no-secrets/no-provider-call
   behavior.
4. **Evidence.** Add deterministic adapter/CLI tests for usage mapping, raw
   reference behavior and the new gate. Alpha records F-3/F-4 resolution in
   the existing self-coherence fix-round history; fresh beta must verify a
   successful GitHub Actions run for the repair head.
