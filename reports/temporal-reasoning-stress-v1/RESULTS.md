# Temporal reasoning stress v1 — Luna full run

Status: completed 108-call development experiment; deterministic and evidence
replay verified. One adapter-level runtime failure is retained and was not
retried.

## What was tested

The frozen 36-case set combines 3, 5 and 8 rule applications with chain or
same-entity conjunction topology. In every case, a source fact or bridge rule
is copied with an explicit dependency, then replaced by its opposite or
withdrawn. `WorldAgent` is reconstructed from its journal before the query.
The answer must contain the final signed-Horn status and the exact sorted IDs
of the active minimal support.

`gpt-5.6-luna` at low reasoning received every case once in each condition:

- P0: equivalent natural-language event history;
- P1: formal events and Prolog clauses, without execution;
- P2: byte-identical P1 plus the trusted checker receipt.

Every call used one allowed physical dispatch, no harness retry, no fallback
and no tools. No failed or incorrect call was replaced.

## Frozen primary result

The preregistered primary metric includes the required canonical sorting of
support IDs.

| Condition | Runtime valid | Canonical exact |
| --- | ---: | ---: |
| P0 natural history | 35/36 | 33/36 |
| P1 formal history | 36/36 | 34/36 |
| P2 P1 + checker receipt | 36/36 | 36/36 |

P1→P2 has two P2-only exact cells, no P1-only cells, and an exact two-sided
McNemar p-value of 0.5. This sample does not support a comparative claim.

Both P1 failures contain the correct status and the correct support set in a
non-canonical order. The receipt therefore improved answer-contract compliance
in those two cells, not logical accuracy.

## Semantic content diagnostic

Ignoring only the order of otherwise identical support IDs:

| Condition | Correct status | Correct status + support set |
| --- | ---: | ---: |
| P0 | 35/35 runtime-valid | 34/35 runtime-valid |
| P1 | 36/36 | 36/36 |
| P2 | 36/36 | 36/36 |

There is no observed P1→P2 solver increment on status or support-set content.
The sole semantic P0 error is the eight-step conjunction case
`trs-d8-join-bridge_rule-positive_to_negative`: the status was correct, but
the answer omitted the active base fact from its proof support.

The remaining P0 non-exact cell is a runtime anomaly. The provider returned a
correct canonical answer after one recorded physical dispatch and terminal
status `completed`, but the Hermes adapter exposed the run as failed with an
internal `Invalid API response after 3 retries` message. The transport guard
records SDK retries 0, HTTP retries 0 and exactly one physical dispatch. The
provider text is retained only as a diagnostic; the frozen score remains a
runtime failure.

## Interpretation

The persistent-memory implementation passed every generated oracle and
no-dependency control before model collection. The live result also shows that
Luna can follow the combined revision and 3/5/8-step inference histories almost
perfectly from natural language and perfectly from formal memory.

That is also the limitation: this benchmark still leaves P1 at a semantic
ceiling. It does not demonstrate that executing Prolog improves multi-step
reasoning. P2's primary 36/36 demonstrates reliable receipt transcription and
canonicalization on this set. It does not demonstrate autonomous checker use,
natural-language formalization, clinical reasoning, broad logical intelligence
or a production benefit.

The next hard wave preserves temporal revision while adding interacting
entities, alternative proof paths, explicit conflicts and queries whose answer
cannot be found by following one visually isolated route. Its design is frozen
in
[`temporal-relational-stress-v2`](../../.cdr/waves/temporal-relational-stress-v2/protocol.md).

## Evidence

- Fixture SHA-256:
  `6a8cca67e2cf38fc612ad071ed29dc392b67d35fdb3c33d958f5f49620e63ba3`
- Report SHA-256:
  `31d12f3726e98464059c8faabff719afc8dd30b0f06f51b6ee75aca7989dd0fc`
- Analysis SHA-256:
  `11eb5c8640015421f008a2ac2fa62c920ac020df7b1443948b85a1a96ff91129`
- Raw report: `luna-full-20260913-v1/report.json`
- Post-hoc diagnostic: `luna-full-20260913-v1/analysis-v1.json`

Replay the frozen scores, prompts, evidence hashes, runtime contract and source
snapshots with:

```sh
node world/temporal-reasoning-stress/verify-report.cjs \
  reports/temporal-reasoning-stress-v1/luna-full-20260913-v1
```
