# Gamma repair R1: bind P1 proof to its exact case

Fresh CDR beta found that receipt intake accepts an arbitrary well-formed
64-hex `trusted_proof_sha256` for P1. Shape validation is not a proof binding.
This is a `REVISE` finding, despite all offline gates otherwise passing.

## Required repair

Alpha must add a versioned, immutable case-to-proof-digest registry. Its
entries are calculated from the canonical serialization of each case's
`runTrustedQuery` result against the pinned CDD source snapshot, and the
registry must record its self-hash plus source/dataset bindings. It contains
only case IDs and digests, never hidden answer contracts or raw model output.

Receipt intake must load that registry as a trusted input, bind it in the
envelope, and reject P1 unless `trusted_proof_sha256` equals that exact case's
registered digest. P0 remains proof-null. The synthetic fixture must be
updated from the registry; the validator self-test must reject a valid-format,
wrong digest. Existing no-provider/no-network/local-raw/no-effectiveness
boundaries remain unchanged.

## Beta exit

Fresh CDR beta reproduces the registry from the pinned trusted query where the
environment allows it, validates the registry self-hash and independent
case binding, and mutates a P1 digest to another valid 64-hex value. GO may be
`GO_PREPARATION` only; it is not a result or an observed effectiveness claim.
