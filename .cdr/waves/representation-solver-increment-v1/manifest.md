# CDR wave manifest: representation-solver-increment-v1

Status: `hypothesized`. This is the solver increment over the sealed
representation-formalization fixture, not a replacement for its P0/P1 result.

## Conditions and estimands

For each of the same 24 generated worlds, one independent fresh Codex turn is
collected for each condition: P0 (natural language, no tool), P1 (Prolog text,
no tool), and P2 (the P1 text plus one sealed no-argument Prolog broker).

- P0 to P1 is the representation comparison.
- P1 to P2 is the logical-engine comparison.

P2's broker is a private per-call executable that evaluates only the sealed
case's fixed program and fixed query. A valid P2 trace contains exactly one
broker command with no arguments and a receipt that agrees with direct SWI
recomputation. P0/P1 reject all command/tool events and retain denial of SWI.

## Pinned collection

- Fixture: the existing 24-case fixture, SHA-256
  `f8a8286bd06df2e8945d82a3439ca2e7a7fece884e5473cf39cfbda9bb2e95e3`.
- Transport: explicit `codex-seatbelt-p2` only; no API fallback.
- Model: `gpt-5.3-codex` supplied explicitly to both sealed config and CLI.
- Sampling/retries: existing pinned config schema; temperature `0`, top-p `1`,
  one attempt, no retry.
- Plan: 72 records, exactly 24 per condition. P0/P1 retain 12 `P0→P1` and 12
  `P1→P0` pair orders. All raw evidence is in one new absolute external root.

The resulting aggregate remains `not-a-cdr-receipt`. A fresh β must recompute
raw hashes, P0/P1 no-tool traces, P2 one-broker traces/receipts, and all three
condition counts before any result is reported.
