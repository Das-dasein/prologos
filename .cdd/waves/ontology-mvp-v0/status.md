# Status: ontology-mvp-v0

- State: `GO`
- Current stage: beta R3 audit passed
- Scope correction: ontology vocabulary must be domain-neutral; employment
  predicates are fixtures, not the product contract
- CDR dependency: F3 unresolved in `prolog-memory-eval-v0`
- Next action: pin commit `d735835e8a8d3c5240896172ead4317ea0562623` as the CDR
  F3 harness dependency and run the CDR harness

Beta R3 verified the independent denylist, domain-neutral registry extension,
provenance filtering, path-free errors, candidate_version preservation and
durable-memory isolation. The commit is suitable for pinning into CDR F3.
