# Alpha report — semantic branch dream v2.1

Status: `alpha observed-not-scored`; not a CDR receipt. Beta review is pending.

v2 was aborted before a valid trace because its formalization prompt mixed an
incompatible `atom(...)` profile into executable candidates. v2.1 excluded the
one exposed case, replaced it before any new model call, and froze the amended
fixture and prompt revision in commit `726477f`.

The valid v2.1 alpha run used eight fresh controlled texts. Every case received
one Luna baseline formalization and two hypothesis calls over that exact same
baseline: `plain` and `declared`. The declared response adds an
`ambiguous/explicit_xor/explicit_or` field; it does not receive a separate
model call. Alias/type branches are structurally impossible in both schemas.

| Frozen independent class | Cases | Plain: accepted connector branch | Declared: accepted connector branch | Declared assessment |
| --- | ---: | ---: | ---: | --- |
| bare `either … or` | 4 | 4 / 4 | 4 / 4 | 4 / 4 `ambiguous` |
| explicit XOR | 2 | 0 / 2 | 0 / 2 | 2 / 2 `explicit_xor` |
| explicit inclusive OR | 2 | 0 / 2 | 0 / 2 | 2 / 2 `explicit_or` |

The fail-closed replay made zero model calls and reproduced all 16 condition
traces: each bare case is `branch_dependent`; every explicit control is
`unresolved` because it contains no accepted branch. This is a successful
controlled alpha observation that the clear abstention instruction separates
these eight templates. It does not show a benefit from the declared field,
because both conditions behaved identically; it does not establish general
natural-language disambiguation, answer accuracy, or a memory benefit.

Next CDR gate: fresh Beta verifies commit/sample hashes, v2 exclusion, prompt
equivalence apart from the declaration, no hidden labels in requests, schema
scope, raw receipts, and replay. Gamma may record only Beta's calibrated
conclusion.
