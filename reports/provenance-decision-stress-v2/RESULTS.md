# Provenance decision stress v2 — Luna

Status: completed live development experiment; deterministic replay verified.

The frozen 24-case fixture was run once in P0 natural language, P1 equivalent
signed-Horn text, and P2 byte-identical P1 plus a host checker receipt. All 72
calls used `gpt-5.6-luna` with low reasoning through the installed Hermes
transport. Every call was runtime-valid and format-valid, with one physical
dispatch, no retry, no fallback, and no tools.

| Condition | Exact decision + support | Decision only | Support only |
| --- | ---: | ---: | ---: |
| P0 natural language | 16/24 | 23/24 | 16/24 |
| P1 formal text, no execution | 16/24 | 24/24 | 16/24 |
| P2 formal text + checker receipt | 22/24 | 22/24 | 22/24 |

For the prespecified primary P1→P2 exact metric, paired cells are 16 both
correct, 0 P1-only, 6 P2-only, and 2 both wrong. The two-sided exact McNemar
value is `p=0.03125`. The same cells apply to support accuracy. This is evidence
that the structured checker receipt improved exact proof-provenance output on
this bounded synthetic wave.

It did **not** improve the downstream action decision. P1 decision-only accuracy
was 24/24 and P2 was 22/24: 22 both correct, 2 P1-only, 0 P2-only
(`p=0.5`). In two three-path cases P2 returned `ask` although the receipt
contained a qualifying independent pair. Therefore this run does not establish
that Prolog execution improves `act/ask/pause` selection.

The error split explains the exact gain. In all eight `act` cases, P0 and P1
usually found the right action but included rule source groups in `SUPPORT`,
although the contract required fact source groups only. P2 made that exact in
all four simple independent-pair cases and two of four three-path choice cases.
All conditions were 16/16 exact on insufficient, unknown, conflict, and
contradicted controls. The observed effect is consequently localized to the
representation and serialization of proof provenance.

Input token totals were P0 21,476, P1 20,744, and P2 25,886. Output totals,
including provider-reported reasoning usage, were P0 2,130, P1 2,157, and P2
1,041. These unequal inputs are part of the treatment: P2 contains the receipt.

This is one model sample per condition on AI-authored synthetic worlds and a
host-authored policy. It does not test extraction, admission, retrieval,
autonomous checker invocation, real action, or dreams. The exact paired value
does not turn this development wave into a general Prolog-utility claim.

Artifacts:

- Fixture SHA-256: `6aeb1c9021bfea99dbfe13e25fbec46fb54c7d6f21fbf963d136380a58692b24`
- Report SHA-256: `727056fa56b84b25738c1d0b48d5ef89cf0af9ca752231e700797b636a168d7a`
- Analysis SHA-256: `f772c4c8f2b18529486ac4938058927b8dcda59b2126c722892436de1317c44d`
- Analysis source SHA-256: `0e50459c5d9feada33200bba4af37cc7995ce4970f8f9711af6757beac803333`
- Raw evidence: 72 `adapter.json` and 72 `process.json` files.
- Superseded v1: zero provider calls; wrong date in seed identifier.
- V2 pre-dispatch failure: zero provider calls; missing report-parent creation,
  repaired and documented before this run.

Replay without provider calls:

```bash
node world/provenance-decision-stress/verify-report.cjs \
  reports/provenance-decision-stress-v2/luna-full-20260913-v1
node world/provenance-decision-stress/analyze-report.cjs \
  reports/provenance-decision-stress-v2/luna-full-20260913-v1 \
  reports/provenance-decision-stress-v2/luna-full-20260913-v1/analysis-v1.json
```
