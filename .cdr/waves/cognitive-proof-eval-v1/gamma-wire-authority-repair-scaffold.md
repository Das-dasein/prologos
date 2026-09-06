# Gamma scaffold: remove collector self-pin from wire authority (issue #44)

## Defect

Receipt v4's registry binds the source SHA-256 of
`trusted-proof-live-candidate.js` and its config template. That collector is
not the authority that creates a provider request: it consumes sealed
assemblies, calls the already pinned transport and writes receipt fields.
Because it must change merely to consume a new receipt version, v4 creates an
infinite CDR re-registration loop without any wire change.

This repair narrows no trust boundary. It corrects the *identity boundary*:
actual wire authority is the sealed assembler plus the answering/raw-artifact
transport. Consumer code is instead checked by exact submitted prompt/raw
artifacts, case/condition prompt digest registry, run binding and CDR receipt
validator.

## Required CDR v5 work

1. Create a forward-only v5 registry, schema, fixture, docs and validator.
   Bind source hashes only for `providers/openai-answering.js` and
   `trusted-proof-answering.js` (plus the pinned sealed assembler identity),
   literal templates/input mode and sampling request semantics. Do **not** bind
   `trusted-proof-live-candidate.js` or any operator config-template file.
2. Retain all P0/P1 prompt digest rebuilding, proof binding, local prompt/raw
   hash/ref uniqueness, run/source/dataset/slot/retry/equal-E/leak gates.
   A consumer cannot choose a different prompt because v5 independently checks
   the local prompt artifact against exact registered digest; it cannot forge
   raw provenance without the pinned transport boundary and local hash.
3. Add tests proving: a synthetic consumer/source hash is absent from registry;
   changing consumer-only source does not alter/reject v5 registry; changing
   either transport source, literal template/input/sampling semantics, prompt
   or raw artifacts still rejects; and v1-v4 are rejected.
4. Preserve v4 history; no provider/network/model call, live raw data,
   aggregate/effectiveness claim or policy/data/oracle/threshold/v0 change.

## Beta exit

Fresh beta confirms the narrower source list is exactly the two wire authority
files, recomputes every digest, tests all retained drifts, and verifies that a
collector-only content change does not trigger source drift while a real wire
change does. GO is `GO_PREPARATION` only.
