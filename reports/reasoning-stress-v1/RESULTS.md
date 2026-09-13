# Reasoning stress v1 — Luna

Status: completed local development experiment; deterministic replay verified.

The frozen 32-case fixture was run once in each of three conditions with
`gpt-5.6-luna`, low reasoning, through the isolated installed Hermes transport.
All 96 calls completed with one physical dispatch, no retry, no tools, an exact
two-message prompt and retained raw adapter evidence.

| Condition | Correct | Meaning |
| --- | ---: | --- |
| P0 natural-language world | 31/32 | Model reasons from the natural rendering |
| P1 equivalent signed-Horn world | 32/32 | Model reasons from the formal program without execution |
| P2 P1 plus host checker receipt | 32/32 | Model receives and transmits executed checker output |

Paired cells are P0/P1: 31 both correct, 0 P0-only, 1 P1-only, 0 both
wrong; P1/P2: all 32 both correct. Exact McNemar evidence from one discordant
pair is insufficient for a comparative claim.

The sole error is `rs-d3-join-contradicted-r1/P0`. Luna returned `conflict`
instead of `contradicted`. The positive branch's facts are split between the
queried entity and a decoy, so its same-entity conjunction cannot fire; only
the negative branch is complete. P1 and P2 classified that case correctly.

This is one illustrative representation error, not evidence of a stable P1
advantage. There are only two replicas per stratum, one model sample per
condition and a synthetic generated vocabulary. P0 is also longer in observed
input tokens than P1, so the comparison does not isolate syntax from length.
Observed input-token totals were P0 12,048, P1 10,738 and P2 16,213. Output
totals, including provider-reported reasoning usage, were 725, 1,021 and 255.

There is no observed P1→P2 solver increment: P1 already reached 32/32. P2's
32/32 establishes that Luna copied every valid host receipt under this answer
contract. It does not show that solver execution improved accuracy, that the
model would autonomously invoke the checker, or that receipts help next-action
selection.

This experiment uses gold formal memory. It says nothing about dialogue
extraction, semantic fidelity, admission, temporal retrieval, action policy or
dreams. Those remain separate full-pipeline stages.

## Evidence

- Frozen fixture: `.cdr/waves/reasoning-stress-v1/fixture.json`
- Fixture SHA-256: `ebd9ef11480a12d4295cae503dfcdcd5a9aff8fe5c19bb95f191f83eb8dd9750`
- Full report: `luna-full-20260913-v1/report.json`
- Full report SHA-256: `b923c37c6db92c4b9133cc479b2ab43ac1a0f551b2e35cb3a7353ff516739f3b`
- Successful smoke: `luna-smoke-20260913-v2/report.json`
- Pre-dispatch failed smoke: `luna-smoke-20260913-v1/report.json`; zero physical
  dispatches, caused by a trailing-newline mismatch at the Hermes message gate;
  it is retained as engineering evidence and excluded from the 96-call result.

Recompute the report from frozen inputs and raw evidence:

```sh
node world/reasoning-stress/verify-report.cjs reports/reasoning-stress-v1/luna-full-20260913-v1
```

The next experiment must avoid another P1 ceiling. It should increase
compositional ambiguity and evaluate downstream decisions that require exact
proof provenance, while preserving this wave as a separate reasoning-only
control.
