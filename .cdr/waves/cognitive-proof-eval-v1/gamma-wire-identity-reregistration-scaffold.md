# Gamma scaffold: CDR receipt v3 wire-identity re-registration (issue #38)

## Why v3 is required

Receipt v2 correctly binds a concrete assembled prompt but its registry uses
synthetic `aa…`/`bb…` template identities. PR #37 (`4b403d1775c3de727f4f2408cada2408435a849d`)
now publishes the first real, no-wrapper answering wire contract:

- base template is literal `{{assembled_prompt}}`;
- wrapper template is literal `none`;
- `providers/openai-answering.js` exports their runtime SHA-256 values; and
- the transport passes sealed `assembled.prompt` byte-for-byte as the provider
  `input`.

V2 is historical preparation and must remain unchanged. V3 is a separate,
forward-only preparation format.

## Required alpha work

1. Add a v3 prompt-digest registry whose self-hash binds all existing CDR
   inputs and additionally: immutable transport source commit, SHA-256 of the
   answering transport source(s), exact exported wire template hashes, and the
   byte-for-byte input mode. Rebuild all case P0/P1 prompt digests from the
   sealed assembler; do not copy or retain raw prompt/oracle/provider bytes.
2. Add separate receipt-intake v3 schema, synthetic non-result fixture,
   documentation and deterministic validator. V3 candidate records retain v2
   local prompt/raw evidence but accept only the real registered wire hashes in
   their `run`, the exact v3 prompt registry and correct case/condition prompt
   digest. V1/v2 are invalid inputs to v3, never upgraded.
3. Preserve every prior integrity gate: P0/P1 completeness and uniqueness,
   source/dataset/slot/proof bindings, retry, equal measured `E`, local-only
   raw and prompt artifact hashes, no overwrite/shared refs and leakage
   rejection. Candidate validation makes no network/provider/model call.
4. Add focused negative tests for synthetic v2 identities, a valid-format
   wrong real wire identity, a changed transport source hash/commit, bad
   transport binding/self-hash, input mode mismatch, P0/P1 prompt swap and
   changed local prompt artifact.
5. Amend method/status/manifest only to state that v3 is the future adapter
   target; do not alter thresholds/dataset/oracle/v0 or claim effectiveness.

## Beta exit

Fresh beta independently derives the exported wire hashes, verifies the
transport source binding and recompiles/rebuilds the v3 registry; then applies
the negative cases. A GO is `GO_PREPARATION` only. No provider invocation,
credential, live output, aggregate or result belongs in this issue.
