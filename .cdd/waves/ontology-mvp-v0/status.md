# Status: ontology-mvp-v0

- State: `REVISE`
- Current stage: beta R2 audit completed; alpha repair R3 required
- Scope correction: ontology vocabulary must be domain-neutral; employment
  predicates are fixtures, not the product contract
- CDR dependency: F3 unresolved in `prolog-memory-eval-v0`
- Next action: repair provenance filtering, deterministic parameter rejection,
  base-predicate protection, and registry-based universal predicates, then run
  a fresh beta audit

Beta R2 found a blocking boundary defect: custom registry declarations can
admit runtime/system predicates such as `ontology_derived/1` and `consult/1`.
The commit is not suitable for pinning into CDR F3 until the immutable-core
denylist is enforced independently of the custom registry.
