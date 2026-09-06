# CDR beta review — issue #76 clean proof-consumption replay v10

Independent review of alpha commit
`eab1420dd967d65de291491ab642d7d726b9cf41` and the gamma v10 scaffold.

## What is correctly bounded

- P1 is assembled by the host from `runTrustedQuery` before the answering
  child exists. The child receives the serialized trusted proof DAG or
  missing-goal result in the sealed prompt; no Prolog tool, AST, rule-admission
  path, evaluator, or hidden scoring contract is added.
- P0/P1 retain the registered counterbalanced order map. The fake-only
  collector produces exactly 24 records, preserves native token/cache
  counters and raw references, and labels its output
  `clean-diagnostic-candidate-not-an-effect-result`.
- The mandatory, actual macOS Seatbelt preflight is invoked before the first
  answering child. It denies the checkout, `MEMORY.md`, dataset/evaluator and
  outside-root writes while allowing the sealed input and declared output.
  Each answering child gets a newly created sealed root and uses `-C`,
  `--skip-git-repo-check`, `--ignore-user-config`, `--sandbox read-only`, and
  only the exact `auth.json` exception. JSONL host-path exposure rejects the
  run; harmless tool-event counters are retained rather than treated as proof
  of contamination.

## B76-1 — live transport cannot reach Codex

`createSeatbeltProfile` builds `(deny default)` but contains no
`allow network-outbound` (or other network) rule. Therefore the future live
`codex exec` child cannot reach its provider. This is a protocol blocker, not
a merely missing test: Seatbelt denies operations absent an allow rule.

An independent local probe also failed under the generated profile before a
network request could be made because TLS configuration was not readable
(`Operation not permitted` for `/private/etc/ssl/openssl.cnf`). Thus the
profile is proven useful as a host-read boundary, but it is not yet a runnable
Codex provider profile.

Repair requirements:

1. Add the minimal explicitly documented outbound-network allowance required
   for the Codex provider.
2. Add only the non-evaluative certificate/runtime reads demonstrably required
   by the provider, without granting the checkout, datasets, evaluator,
   `MEMORY.md`, home, or a broad `/private` tree.
3. Add an offline runtime preflight proving the resolved Codex binary can
   start in the profile, alongside the existing host-read/write denial probes.
   Do not make a provider/auth call in CI.

## Independent checks

```text
npm run test:trusted-proof-codex-clean-replay:v10
npm run test:trusted-proof-codex-seatbelt:v10
npm run test:codex-diagnostic:v9
npm run test:trusted-proof-codex-exec-live-candidate
npm test
git diff --check
```

All passed. I additionally checked the real resolved local Codex executable
under the generated profile: `codex --version` starts when invoked through
the resolved binary. The profile nevertheless has no Seatbelt network allow
rule, and a sandboxed TLS probe failed on the missing SSL configuration read.
No provider, auth, network or model call was made by this review.

## Verdict

**REVISE.** The proof-consumption and host-evidence boundaries are sound for
offline preparation, but B76-1 must be repaired before the clean replay can
be offered as a runnable live experiment.
