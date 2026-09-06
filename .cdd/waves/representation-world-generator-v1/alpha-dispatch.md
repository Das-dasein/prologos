# α dispatch: representation-world-generator-v1

You are α for the bounded CDD implementation cycle. Work in a fresh session.

## Read first

1. `.cdd/waves/representation-world-generator-v1/gamma-spec.md`
2. `.cdr/waves/representation-formalization-v1/manifest.md`
3. The repository's existing Prolog-engine and test conventions.

## Task

Implement only the generator, its deterministic Prolog oracle, prompt-pair
assembler, focused tests, and npm-script integration specified by the γ spec.
Keep the historical `trusted-proof-preflight.js` and
`cognitive-proof-eval-v1` untouched.

## Hard boundary

P1 is Prolog *text*, not a trusted Prolog result. Do not call a Prolog engine
while building P1's provider-facing prompt, do not serialize any proof or
answer result into it, and do not expose a solver tool to P0 or P1.

## Return artifacts

Commit the implementation and report the commit SHA, changed paths, focused
test command/output, `npm test` result, and any limitation. Do not run a live
provider or make a CDR effectiveness claim.
