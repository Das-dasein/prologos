# Temporal relational stress v2 — full frozen result

Status: completed and independently replay-verified.

The frozen wave contains 32 synthetic signed-Horn cases crossed with four
conditions, for 128 model calls. Cases vary proof depth (4 or 7), relational
topology (chain of joins or diamond), revision count (2 or 4), and final status
(`entailed`, `contradicted`, `unknown`, or `conflict`). Every call used
`gpt-5.6-luna`, low reasoning effort, one physical dispatch, no retries, no
fallback, and no tools.

Fixture SHA-256:
`d65c9825312799a608dc1f22b0829efec294d01953030cccb9affac22ce84cc2`.

Report SHA-256:
`9cb657ccf3fdf7c5057113dbd42cfb64f34c673a48236a9db79ea63034bc67ea`.

Analysis SHA-256:
`fde89df6dbbdf50d91b3a8493127234132f1edc14f9fc5fb428dd6ab6f137925`.

## Aggregate result

| Condition | Runtime valid | Status correct | Exact support sets | Fully exact |
| --- | ---: | ---: | ---: | ---: |
| P0 natural event history | 32/32 | 27/32 | 14/32 | 13/32 |
| P1 formal event history | 32/32 | 26/32 | 12/32 | 12/32 |
| P1F final active formal snapshot | 32/32 | 32/32 | 14/32 | 14/32 |
| P2 formal history plus trusted receipt | 32/32 | 32/32 | 31/32 | 31/32 |

P0 and P1 do not show a directional difference: for status, P0 alone was
correct in four cases, P1 alone in three, both were wrong in two, and the exact
paired McNemar p-value is 1. P1 therefore provides no measured advantage over
the natural-language representation in this wave.

P1F was correct on all six status cases missed by P1. The paired status cells
are 26 both correct, 0 P1-only, 6 P1F-only, and 0 both wrong (exact two-sided
McNemar p = 0.03125). This isolates event-history projection as the main source
of status failures in the frozen sample: once the final active snapshot is
supplied, the model completes the remaining logical status task in every case.

P2 has the same 32/32 status result as P1F, but raises exact support recovery
from 14/32 to 31/32. Relative to P1, exact recovery has 12 both correct, 0
P1-only, 19 P2-only, and 1 both wrong (exact two-sided McNemar p =
0.000003814697265625). The one P2 mismatch retained the correct status and
copied one opaque support ID incorrectly: `tv029_i_2f40c44` instead of
`tv029_i_2f40ddf`. It is a receipt transcription error rather than a checker or
logical-status failure.

All conditions scored 8/8 on `unknown`, where both support collections are
empty. The difficult cells are the positive, negative, and conflict cases that
require following a live proof while excluding replaced or projected-away
items. At depth 7, exact recovery was P0 5/16, P1 5/16, P1F 5/16, and P2 15/16.

## Interpretation boundary

This is evidence for two bounded engineering claims on one frozen synthetic
wave:

1. Supplying the correctly projected active state removed all observed status
   errors caused by reasoning over revision histories.
2. Supplying a trusted checker receipt made exact proof provenance far more
   reliable, while still permitting a rare model copying error.

The run does not establish a general Prolog advantage, clinical usefulness,
natural-language extraction fidelity, or performance on real records. P2
contains a host-computed answer receipt, so its status score is a protocol
check; its useful measured failure mode is whether the model preserves the
receipt exactly. Generalization requires new frozen waves and independent
models or seeds.

The full evidence, prompts, responses, source snapshot, report, and posthoc
stratified analysis are retained under `luna-full-20260913-v1/`.
