# Status: ontology-mvp-v0

- State: `REVISE`
- Current stage: beta R1 audit completed; alpha repair R2 required
- Scope correction: ontology vocabulary must be domain-neutral; employment
  predicates are fixtures, not the product contract
- CDR dependency: F3 unresolved in `prolog-memory-eval-v0`
- Next action: repair provenance filtering, deterministic parameter rejection,
  base-predicate protection, and registry-based universal predicates, then run
  a fresh beta audit

Beta R1 residual findings: provenance still includes non-supporting successful
rules; SWI errors expose filesystem paths; malformed proposals lose the
required candidate version; and the registry needs a genuinely extensible
domain-neutral declaration mechanism.
