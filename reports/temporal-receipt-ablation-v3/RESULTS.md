# Temporal receipt ablation v3 — full frozen result

Status: completed and independently replay-verified.

The frozen wave contains 32 synthetic final active signed-Horn snapshots crossed
with four conditions, for 128 runtime-valid `gpt-5.6-luna` calls. All calls used
low reasoning effort, one physical dispatch, no retries, no fallback and no
tools. Temporal event history was absent from every prompt.

Fixture SHA-256:
`1dea093ca496d8d9fc4fb03a0e2534e65ff558c94e25843bdb9e8b1e4f7cb74f`.

Report SHA-256:
`448570bda230796b8a6a7634b9877fbd0667dd359ee8cc2231cd0213ca9c71ba`.

Analysis SHA-256:
`d77c9a1ef4eb6ee8644bb9bd6a031e6458c03ec58a11f2eedb3cacdf60a7e2c6`.

## Aggregate result

| Condition | Runtime valid | Status correct | Exact support sets | Fully exact |
| --- | ---: | ---: | ---: | ---: |
| L: active snapshot only | 32/32 | 28/32 | 13/32 | 13/32 |
| V: snapshot + status only | 32/32 | 32/32 | 13/32 | 13/32 |
| S: snapshot + labeled support IDs only | 32/32 | 32/32 | 32/32 | 32/32 |
| F: snapshot + full receipt | 32/32 | 32/32 | 32/32 | 32/32 |

`V` rescued four status errors relative to `L`, with paired cells 28 both
correct, 0 L-only, 4 V-only and 0 both wrong. The exact two-sided McNemar
p-value is 0.125. This is a direct verdict-transport effect and is not evidence
of improved logical inference. It did not improve exact provenance: L and V
were both exact in 11 cases, each was uniquely exact in two, and both failed in
17 (p = 1).

`S` raised exact recovery from 13/32 in L and V to 32/32. Against either
baseline, paired exact cells are 13 both correct, 0 baseline-only, 19 S-only
and 0 both wrong (exact two-sided McNemar p =
0.000003814697265625). The support lists are explicitly labeled positive and
negative, so their emptiness pattern also encodes the four-way status. S is
therefore a provenance-copying and polarity-reading condition, not a test of
multi-step inference.

`F` and `S` were identical on every scored metric. Adding an explicit status
field to already labeled positive/negative support lists produced no observable
benefit in this wave.

## Logic-only behavior

`L` is the only condition without checker output. It obtained 28/32 status and
13/32 exact provenance. All eight unknown cases were exact. On the 24 cases
with at least one proof, exact recovery was 5/24. The four status errors were
three `entailed → unknown` errors and one `conflict → contradicted` error.

Depth 7 versus 8 did not produce a monotone degradation: L was 14/16 status and
6/16 exact at depth 7, versus 14/16 and 7/16 at depth 8. The construction
variant with four hidden revisions left more final-snapshot distractors and had
12/16 L status versus 16/16 for the two-revision variant, but that stratified
difference is post-hoc descriptive evidence, not an independently randomized
temporal effect.

## Interpretation boundary

This wave successfully separates three mechanisms on one frozen synthetic
sample:

1. model-only inference over a correctly projected active snapshot remains
   fairly reliable for status but unreliable for exact non-empty provenance;
2. a status-only receipt transports the verdict but does not repair proof
   provenance;
3. labeled support receipts transport provenance exactly, and already encode
   status through positive/negative list occupancy.

The result does not establish a general Prolog advantage. S and F contain
host-computed checker outputs, while L has no matched non-Prolog solver
baseline. It also does not test natural-language extraction, temporal
projection, autonomous tool choice, clinical records or real-world actions.

The initial two-case smoke had one streaming timeout and is retained as
excluded engineering evidence. A single transparent recovery call under the
frozen wider runtime envelope completed with correct status and inexact
provenance. Neither smoke is pooled into the 128-call result.
