# Status: ontology-mvp-v0

- State: `GO`
- Current stage: alpha repair R6
- Scope correction: ontology vocabulary must be domain-neutral; employment
  predicates are fixtures, not the product contract
- CDR dependency: F3 unresolved in `prolog-memory-eval-v0`
- Next action: pin commit `d735835e8a8d3c5240896172ead4317ea0562623` as the CDR
  F3 harness dependency and run the CDR harness

Alpha R6 removes the former employment-shaped predicates from the default CDD
registry. Domain vocabulary is accepted only through an explicit versioned
proposal registry; legacy memory ingestion and named test fixtures remain
separate. Safety, provenance, error, version, and isolation checks remain
covered by the focused harness and full test suite.
