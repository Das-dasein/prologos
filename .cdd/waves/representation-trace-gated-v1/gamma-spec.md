# CDD γ specification: representation-trace-gated-v1

## Fixed live protocol

Run the 24-case P0/P1/P2 fixture using explicit Codex model
`gpt-5.4-mini` and provider `codex-trace-gated-p2`.

The outer macOS Seatbelt is not part of this transport. Each call instead runs
in a fresh empty Codex workspace with private copied auth state. This is a
trace-gated, not OS-preventive, boundary:

- P0/P1 are valid only when native JSONL contains no tool or command event.
- P2 is valid only when JSONL contains exactly one private no-argument broker
  command and its receipt matches direct SWI recomputation.
- Any other event, path exposure, malformed trace, missing usage/output, or
  transport failure is a raw non-result.

## Acceptance

1. Exact `gpt-5.4-mini` single-call probe is retained as transport evidence;
   it must produce valid structured output and native usage.
2. Fresh α runs exactly one 72-call raw collection, with 24 records per
   condition and existing P0/P1 order balance. No retry/fallback.
3. Fresh β independently audits raw hashes, all trace events, P2 receipts,
   model/config identity, and recomputes metrics before any receipt.
4. All reporting calls this a trace-gated experiment; it must not claim that
   P0/P1 were OS-level prevented from attempting tools.
