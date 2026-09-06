# CDD γ specification: representation-world-generator-v1

## Problem

`trusted-proof-preflight.js` is intentionally a different experiment: P1
calls `runTrustedQuery` and embeds its trusted result. It therefore cannot
test whether Prolog *representation alone* changes model reasoning. The
required missing engineering surface is a deterministic, auditable generator
for paired P0/P1 worlds that never computes or transports a proof on P1's
provider path.

## Scope

Implement an offline generator and validator for the CDR method at
`.cdr/waves/representation-formalization-v1/manifest.md`.

### Implementation contract

| Axis | Pinned value |
| --- | --- |
| Language | Node.js/CommonJS already used by this repository |
| CLI integration target | New standalone npm script; no change to chat runtime |
| Package scoping | Root `representation-world-generator.js`, focused test file, and `.cdr/waves/representation-formalization-v1/` fixtures only |
| Existing-binary disposition | No existing binary replaced |
| Runtime dependencies | Existing Node.js and local SWI-Prolog adapter only; no network or provider SDK |
| JSON/wire contract | New versioned JSON fixture schema; P0/P1 public prompt material excludes oracle label/proof/engine result |
| Backward compatibility | Do not modify `trusted-proof-preflight.js`, `cognitive-proof-eval-v1`, or existing CDR results |

## Acceptance criteria

1. A deterministic generator accepts an explicit seed and creates exactly 24
   cases covering depth `{1,3,5}` × topology `{chain,join}` × expected
   `{entailed,unknown}` × replica `{1,2}` exactly once.
2. Every case has one formal source world plus two renderings: P0 is
   natural-language facts/rules only; P1 is semantically equivalent Prolog
   facts/rules only. Both carry byte-identical question and answer-format
   instruction outside the representation field.
3. The local Prolog engine computes each expected answer from the formal world;
   the generator fails closed if engine output differs from the stratum label.
4. P1 construction has no `runTrustedQuery` call, proof/result serialization,
   proof digest, or solver invocation in its provider-facing prompt assembly.
   Static and behavioural tests demonstrate this boundary.
5. Unknown cases are generated as non-derivable goals, not as a closed-world
   false answer and not by leaking an expected label into either prompt.
6. The join topology contains a rule with at least two body conditions sharing
   a variable, and its P0/P1 renderings preserve that relation.
7. Tests verify fixed-seed byte-for-byte reproducibility, all stratum counts,
   P0/P1 prompt equality outside representation, forbidden-field absence, and
   Prolog-derived oracle agreement. They run without network or provider calls.
8. `npm test` remains green and a focused npm script runs the generator tests.

## Proof plan

- Focused unit tests inspect all 24 generated cases and call the deterministic
  oracle.
- A prompt-pair test compares a normalized pair with the representation field
  removed, then rejects proof/result/tool/oracle markers in P1.
- `npm test` is the regression check.

## Non-goals

- No live LLM call, token-budget equality assertion, or score aggregation.
- No solver-tool P2 path.
- No modification of historical trusted-proof evaluation artifacts.

## α dispatch

Implement only the pinned scope and report changed paths, focused-test output,
full-test output, and any limitation. Do not create a CDR result or claim.

## β dispatch

Independently inspect the diff and run the focused tests from a clean state.
Reject the work if P1 can receive a proof, engine output, expected label, or
solver capability; if topology/stratum coverage is incomplete; or if the
ground-truth oracle is not independently recomputed.
