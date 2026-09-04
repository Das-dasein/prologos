# Gamma closeout R1: annotation oracle and evaluation matrices

Related issues: #5 and #20. Reviewed beta receipt: `657f06518f8d7ed1b28e6d030f2f57e52af51557`.

## Decision

**BOUNDED-GO.** The synthetic annotation oracle and the preregistered matrix
contract are structurally executable for an offline pilot.

Confirmed boundaries:

- six category rows are pinned to 12 cases and 36 turns;
- annotation scope/qualifier dimensions are validated;
- annotation-v1 to v2/profile identity is hash-bound;
- Matrix A emits numerators, denominators and `N/A` for empty cells;
- Matrix B distinguishes unavailable B1--B4 runs from the B5 gold ceiling;
- B5 denominators are derived from the gold fixture (16 writes, 2 conflict
  cases, 6 provenance claims).

## Not established

No provider call, live extraction result, baseline comparison, causal claim,
utility result, or threshold achievement is established. Full `npm test` still
requires the missing local `tau-prolog` dependency. The next experiment must
provide candidate outputs for B1--B4 and retain source/config/dataset hashes.
