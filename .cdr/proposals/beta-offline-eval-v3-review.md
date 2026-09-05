# β review: offline evaluator v3

Date: 2026-09-05. Reviewed immutable commit `883193d` in a clean state.
Reviewer role: fresh independent β. No code changes, provider calls, network
calls, or LLM-as-judge calls.

## Verdict

`REVISE`. The evaluator is not admissible for CDR closure until the three
blocking findings below are repaired and rechecked by a fresh β. This verdict
does not assess PAM-C1 and does not transmit a model-quality claim.

## Reproduced evidence

Passed: `npm run test:offline-eval:v3`, `npm test`, `npm run test:pilot`, offline
replay; 4 conditions × 12 cases = 48 records; 195 manifest entries and 192
referenced raw files; missing 0; hash mismatches 0; replay SHA-256
`90451653463defc319fa0cab67ebbcb1009660500a92e45f502f421f79abf57e`.
One-to-one fact matching, runtime-ID independence, ambiguity/conflict/stale
fixtures, text-vs-envelope and provider/network prohibition checks passed.

## Blocking findings

1. **Cross-run isolation is absent.** Altering `manifest.run` to `other-run`
while preserving the files is accepted and returned as `run_id: other-run`.
The evaluator has no expected run identity and does not compare aggregate and
manifest identities. A replay can therefore be relabelled as another run.

2. **Zero denominator violates the declared metric contract.** `metric()`
returns `coverage: 0` for denominator zero. The proposal requires `null` for
undefined coverage; zero must not mean no eligible observations.

3. **Missing raw is not represented as unknown.** Removing one referenced raw
file terminates evaluation with `raw manifest integrity failure`. The stated
contract requires a safe `unknown`/`indeterminate` result with coverage loss.

Additional limitation: the aggregate has no own `run_id`, so the replay relies
on the manifest's run value. This is an input-contract weakness related to
finding 1.

## Required repair evidence

α must add fixtures for all three findings, make the smallest contract-preserving
change, regenerate a new versioned replay artifact, and provide deterministic
commands and hashes. Historical aggregate/raw/oracle and old replay remain
immutable. β must repeat the clean replay and adversarial fixtures before any
receipt is considered.
