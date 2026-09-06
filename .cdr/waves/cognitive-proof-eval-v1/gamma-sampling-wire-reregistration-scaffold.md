# Gamma scaffold: CDR receipt v4 after sampling wire repair (issue #42)

## Input fact

PR #41 (`97df020eeffd83df9eaaec4608056046a8ff6198`) fixes a real transport
integrity defect: the exact run `sampling` contract is now canonical
`{ temperature, top_p }`, both fields are forwarded to `responses.create`,
and unsupported `seed` fails before a client/root can exist. Receipt v3 pins
the predecessor sources, so it correctly fails closed and cannot be reused.

## Required CDR v4 preparation

1. Make a forward-only wire prompt registry v4 binding the PR #41 merge,
   SHA-256 of all wire-relevant transport/collector sources, the literal
   no-wrapper template identities/input mode, and the sampling semantics:
   exact keys, bounds (`temperature [0,2]`, `top_p [0,1]`) and request mapping.
   Rebuild sealed P0/P1 prompt digests; retain no prompt/provider raw bytes.
2. Make separate v4 receipt schema, fixture, docs and validator. Candidate v4
   records bind the v4 registry, exact wire values and a run `sampling` object
   with exactly those keys/ranges. V1/v2/v3 inputs are invalid, never upgraded.
3. Preserve all established gates: every case P0/P1, P1 proof exact digest,
   local prompt/raw artifacts and hashes, no duplicate refs/overwrites,
   immutable pair/retry/equal measured E, leakage rejection, source/registry
   self-hashes. No candidate scoring/aggregation occurs in the validator.
4. Add synthetic non-result test cases rejecting seed, missing/extra sampling,
   NaN/out-of-range values, source drift, wire drift, prompt swap/artifact
   change, old v3 envelope and all inherited negative gates.
5. The existing collector must remain untouched during CDR work; it is expected
   to be v3-labelled and fail current v4 until a later CDD R5 changes only the
   receipt emission/binding. No provider/model/network call, raw live output,
   policy threshold/dataset/oracle/v0 change or effectiveness claim.

## Fresh beta exit

Independent beta derives literal hashes/source hashes and reconstructs v4
registry, proves every sampling/source/wire mutation rejects, and verifies no
live behavior. GO means `GO_PREPARATION` only.
