# Controlled OR/XOR cycle — Luna v1 diagnostic

Status: `REVISE`, development observation only; not a CDR receipt. The
pre-registered discrimination question was not actually executed as written.

Eight frozen controlled cases completed: four bare “either A or B” probes and
four controls that explicitly say either “but not both”, “or both”, or “both
are allowed”. The fail-closed replay used the saved candidates with zero model
calls and reproduced all eight branch-dependent traces.

| Source language | Cases | Accepted connector branch | Interpretation |
| --- | ---: | ---: | --- |
| Bare `either … or` | c01–c04 | c02–c04 change status | Luna formalized baseline as `xor` and offered `or`, but the prompt explicitly invited this counterfactual. c01's connector branch is `unknown → unknown`. |
| Explicit XOR | c05–c06 | 2 / 2 | The model proposed `xor → or`, but the prompt never instructed it to abstain on explicit text. |
| Explicit inclusive OR | c07–c08 | 2 / 2 | The model proposed `or → xor`, under the same missing abstention requirement. |

The raw configuration therefore demonstrates that the model follows an
invitation to construct an OR/XOR counterfactual. It does **not** measure
whether Luna can recognize ambiguity: the executed hypothesis prompt says to
return counterfactual hypotheses and describes the swap, without requiring
zero hypotheses for an explicit control. The formalization prompt also did not
enforce the manifest's promised `or` baseline for bare `either-or` wording.

Two extra query-alias branches (c01 and c07) were accepted by the generic v0
schema but are outside this connector-only cycle. In c01, `writer → writes`
is the *only* branch that changes the result; the connector branch does not.
This confirms that a later connector study needs a connector-only schema, not
merely connector-only wording in a prompt.

The next experiment should not add a gate that silently guarantees a good
result. It should compare two pre-registered, equally bounded prompts on new
texts: (1) propose a branch only if the sentence is ambiguous, otherwise
return none; (2) the same request with an explicit
`ambiguous/explicit_xor/explicit_or` declaration in the same model response.
Independent text review scores false proposals on controls and missed valid
alternatives. Prolog status change is secondary. If the declaration adds no
value, remove it rather than layering another filter.

Raw transcripts are local in `raw-luna-v1-20260909/` and are excluded from
Git. The run used eight Luna formalization calls and eight Luna hypothesis
calls; the replay used zero model calls.
