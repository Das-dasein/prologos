# Constructed near-signature diagnostic fixture — draft

This is a deliberately constructed diagnostic benchmark, not a measurement of
Luna's natural M0 error rate. Each immutable item contains English source, a
reified finite-FOL program, a query, and a Prolog certificate before any
review-model call. No item may be repaired at runtime.

The intended balanced set has 16 candidates: eight source-supported naming
mismatches and eight controls where close names are distinct in the English.
Every candidate must have a nonempty `near_signature_audit`; controls exist to
measure false typo allegations rather than to hide the treatment.

The first four items below are a construction check only. They are not yet a
preregistered model wave.
