# P0/P1/P2 answer contract — draft, no model calls

All conditions use this answer instruction verbatim:

> Answer the original question using only the supplied material. Return exactly
> one JSON object: `{ "answer": "A" | "B" | "C", "reason": "..." }`.
> Do not repair, rename, add facts, execute code, or treat a formal certificate
> as an answer by itself.

Common material is the original English context, original question and the
meaning of choices: `A` true, `B` false, `C` uncertain.

P0 ends after the common material.

P1 appends exactly:

```text
Frozen proposed Prolog formalization (do not change it):
Program:
<program bytes>
Query:
<query bytes>
```

P2 appends exactly the P1 suffix followed by:

```text
Read-only execution certificate for that same frozen candidate:
<the exact saved `PAM_DIAGNOSTIC_BINDINGS` line; for invalid_program, the complete
saved validation reason rather than a synthesized verdict>
```

The complete historical runtime transcript remains dashboard-only; warnings,
paths and transport wrappers never enter a prompt. There is no source FOL sidecar, proof, previous Luna answer, gold answer,
counterfactual branch, alias, repair or tool access in any prompt. The response
schema and model settings are identical. Six condition orders are one occurrence
each: `P0,P1,P2`; `P0,P2,P1`; `P1,P0,P2`; `P1,P2,P0`; `P2,P0,P1`; `P2,P1,P0`.

Before a call, byte checks must prove P1 starts with P0, P2 starts with P1, and
the suffixes are the exact saved candidate/certificate. A persisted receipt is
never retried; a technical trace/schema failure stops the remaining calls for
explicit disposition.
