# γ clarification R1: semantic equivalence is a binding oracle

β returned REQUEST CHANGES for commit `4241e4c`. The failure is not a test
mechanics issue: P0 and P1 currently encode different usable meanings for the
same shared question.

## Binding repair

1. Prolog atoms exposed in P1 must be the same meaningful predicates named by
   the shared natural-language question and P0 rendering (for example,
   `calm/1`, `focused/1`, `prepared/1`). Opaque `stage_N/1` atoms are forbidden
   unless the same condition contains an explicit, representation-local
   mapping; the initial wave chooses meaningful atoms instead.
2. A conjunctive join must render variable identity explicitly in P0. Use a
   form equivalent to: "If the same person has both a source trait and a
   marker trait, then that person is calm." Do not repeat indefinite
   `someone` independently for each antecedent.
3. Add regression tests that fail for an opaque P1 predicate/query mismatch
   and fail unless the P0 join states same-subject binding. Retain all existing
   isolation and oracle tests.

## Scope

This repair changes only the generator, its fixture (regenerated from the
same declared seed), and focused tests. It does not alter P0/P1 solver
boundaries, historical trusted-proof files, the 24-case Cartesian design, or
the CDR claim status.
