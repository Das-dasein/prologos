# Status: ontology-mvp-v0

- State: `GO`
- Current stage: beta R6 completed (`PASS`)
- Scope correction: ontology vocabulary must be domain-neutral; employment
  predicates are fixtures, not the product contract
- CDR dependency: F3 unresolved in `prolog-memory-eval-v0`
- Next action: pin commit `b7e42b6` as the CDR F3 harness dependency and run the
  CDR idea-validation harness

Alpha R6 removes the former employment-shaped predicates from the default CDD
registry. Domain vocabulary is accepted only through an explicit versioned
proposal registry; legacy memory ingestion and named test fixtures remain
separate. Safety, provenance, error, version, and isolation checks remain
covered by the focused harness and full test suite. Beta notes that fake-worker
timeout/non-zero and hash-based isolation lack independent focused tests; this
is a bounded limitation for idea validation, not a product-quality claim.
