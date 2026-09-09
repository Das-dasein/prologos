# Controlled OR/XOR cycle — Luna v1 diagnostic

Status: `REVISE`, development observation only; not a CDR receipt.

Eight frozen controlled cases completed: four bare “either A or B” probes and
four controls that explicitly say either “but not both”, “or both”, or “both
are allowed”. The fail-closed replay used the saved candidates with zero model
calls and reproduced all eight branch-dependent traces.

| Source language | Cases | Accepted connector branch | Interpretation |
| --- | ---: | ---: | --- |
| Bare `either … or` | c01–c04 | 4 / 4 | Luna formalized the baseline as `xor` and offered `or`. This exposes the alternative but does not show it can recognize ambiguity. |
| Explicit XOR | c05–c06 | 2 / 2 | Invalid semantic proposal: each branch changed required `xor` to `or`. |
| Explicit inclusive OR | c07–c08 | 2 / 2 | Invalid semantic proposal: each branch changed required `or` to `xor`. |

The control false-positive rate is therefore 4 / 4. The primary claim fails:
with this prompt and branch policy, an accepted connector branch is not a
calibrated indication that the cited English leaves OR/XOR open.

Two extra query-alias branches (c01 and c07) were accepted by the generic v0
schema but are outside this connector-only cycle. They do not change the
conclusion; their presence confirms that the next cycle must use a
connector-only schema, not merely connector-only wording in a prompt.

The useful next repair is structural: have the model first classify the cited
sentence as `ambiguous`, `explicit_xor`, or `explicit_or`; execute a connector
alternative only when it declares `ambiguous`, then score that declaration
against the frozen controls. This keeps full immutable Prolog candidates and
does not introduce an AST or repair loop.

Raw transcripts are local in `raw-luna-v1-20260909/` and are excluded from
Git. The run used eight Luna formalization calls and eight Luna hypothesis
calls; the replay used zero model calls.
