# Semantic branch dream v2 — abstention comparison

Status: `v2 ABORTED BEFORE A VALID TRACE`; `v2.1 PREREGISTERED — NOT RUN`.

The first v2 formalization prompt accidentally mixed `atom(...)` from another
FOL profile into the executable candidate grammar. Its first model call
produced a candidate rejected before execution; no v2 case has a valid trace.
The raw directory stays local as transport evidence. The exposed c01 is
excluded from v2.1 and replaced by c09 before any new model call. v2.1 changes
only this profile error, using lower-case unary terms such as `studies(iris)`.

v2 repairs the question v1 failed to ask. On eight new controlled texts, one
frozen Luna baseline is followed by two equally bounded hypothesis calls:

1. **Plain:** return an OR/XOR alternative only if the cited sentence is
   semantically ambiguous; otherwise return no hypotheses.
2. **Declared:** make the same decision and also declare
   `ambiguous`, `explicit_xor`, or `explicit_or` in the same response.

The model sees only sentence text, question, baseline candidate, and target
sentence ID. It never sees `expected_class`. The output schema permits exactly
one full immutable `connector_interpretation` candidate or none; aliases and
type assumptions are unavailable.

Cases c01–c04 are bare `either … or` phrasing. c05–c06 explicitly specify
exclusive choice. c07–c08 explicitly permit both. The independent review
label is held in the frozen fixture and is used only after execution.

Primary measures: false proposed-branch rate on explicit controls and missed
branch rate on bare cases. For the declared condition, classification accuracy
and agreement between its declaration and branch presence are also measured.
Prolog status change is secondary. A result cannot claim general language
understanding, answer accuracy, or memory improvement.

All candidates must pass the existing fail-closed Prolog executor. A malformed
or out-of-scope candidate is unresolved. Raw model transcripts stay local until
reviewed.

Frozen fixture SHA-256:
`edded6736b7a344190ced18e06c816daa03985a89eada6345ae547dfb7ba29ff`.
Plain-schema SHA-256:
`494920b299c395548fe0c346e013228c05dd26b2b22cffa729a3826916b360ef`.
Declared-schema SHA-256:
`5efa68f3003139f6dc6a53514915bd1113179d39649af92f2b815b40413c8d5b`.

v2.1 fixture SHA-256:
`a27dc3f5bc5c2cd89bc483120b2a3e27b1b5e23c0bfdfbe107433d5c00cd9508`.
