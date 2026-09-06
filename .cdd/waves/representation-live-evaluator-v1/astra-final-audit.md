# Astra final audit: APPROVE (bounded)

Astra independently approved the implemented P0/P1 method and live-collection
code after α/β R2.

## Approved boundaries

- P0/P1 differ only in their representation; shared question/output envelope
  are byte-identical, predicates are meaningful, and P0 joins preserve the
  same-person constraint.
- P1 prompt assembly is pure and does not load the Prolog adapter. Public
  prompts reject oracle/proof/result/engine/tool/solver material.
- The fixed fixture SHA-256 is
  `f8a8286bd06df2e8945d82a3439ca2e7a7fece884e5473cf39cfbda9bb2e95e3` and
  covers exactly the declared 24 strata; SWI recomputation passes.
- The collector seals verified bytes before planning/provider construction,
  requires explicit live opt-in and a fresh absolute raw root, counterbalances
  48 calls, uses a tool-less Responses request, and writes strict local raw
  evidence.

## Explicit limit

No real provider was run. This audit approves method/code only; it does not
establish RFR-C1, emit a CDR receipt, or authorize an effectiveness claim.
