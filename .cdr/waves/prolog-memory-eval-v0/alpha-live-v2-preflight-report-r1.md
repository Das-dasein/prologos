# CDR alpha implementation report R1 — live-v2 preflight

Date: 2026-09-05 (Europe/Samara). Role: narrow CDR alpha implementation
report. This report covers deterministic preparation gates only. It is not a
live experiment, beta verdict, receipt, or PAM-C1 result.

## Implemented boundary

The prospective Luna configuration is pinned at
`.cdr/results/prolog-memory-eval-v0/pilot-live-v2-config.json`:

- provider `codex`, model `gpt-5.6-luna`;
- protocol `prolog-memory-evaluation-v2`, conditions exactly B1–B4;
- `effective_context_budget_tokens=32768`, selected before any output;
- dataset, oracle, trusted `memory.pl` and `domain-rules.pl` SHA-256 digests;
- extraction, Codex adapter, and `PAM-answer-v1` prompt IDs and hashes;
- source commit `790f3ef285eb97d2f3e27700def0857c3b283954`, resolvable locally.

`pilot-live-v2-preflight.js` is deliberately provider-independent. Its command
only reads the pinned config and local inputs and writes a deterministic
preflight artifact. It does not import, construct, authenticate, or invoke a
provider. The report records `provider_calls=0` and leaves runtime budget
measurement explicitly pending the actual run.

The preflight verifies the full runner config/input contract, the exact Luna
and Codex-adapter prompt pins, trusted-source hashes, local source identity,
the six-category 12-case dataset, and a prompt leakage scan. The live
execution gate requires both `--allow-live-provider=true` and a raw-output
directory; missing either fails closed. This does not grant that opt-in to the
preflight command.

The existing fake config remains byte-for-byte unchanged. No network, model
provider, paid call, raw live output, beta verdict, CDR receipt, or PAM-C1 claim
was produced.

## Deterministic checks

```text
npm run test:pilot:preflight
=> exit 0; Luna config, hashes, prompt pins, equal E, live/raw gates,
   leakage and source identity passed; 0 provider calls

node pilot-live-v2-preflight.js \
  --config .cdr/results/prolog-memory-eval-v0/pilot-live-v2-config.json \
  --dataset .cdr/datasets/dialogues-pilot-v1.jsonl \
  --oracle .cdr/results/prolog-memory-eval-v0/answer-oracle-v1.json \
  --output /tmp/pam-live-v2-preflight.json
=> exit 0; preflight artifact written; provider_calls=0
```

Negative fixtures fail closed as required: absent live opt-in is
`LIVE_OPT_IN`, absent raw-output directory is `RAW_OUTPUT_REQUIRED`, altered
effective budget is `BUDGET_CONFIG`, gold material in a dialogue is
`GOLD_LEAKAGE`, altered prompt pin is `PROMPT_PIN`, an unresolvable source is
`SOURCE_IDENTITY`, and altered trusted input is `TRUSTED_HASH_MISMATCH`.

## Remaining live prerequisite

A separately authorized execution must run the pinned runner with
`--allow-live-provider=true` and a fresh raw-output directory. It must retain
provider-declared usage and effective E for every extraction, summary, and
answer request, then produce the four condition artifacts and aggregate for a
fresh independent CDR beta review. Until that happens this wave remains
preflight-only and no comparative or PAM claim is admissible.
