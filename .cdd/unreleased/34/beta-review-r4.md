# Beta review R4: issue #34 candidate-decision admission gate — GO

Fresh independent CDD beta reviewed immutable alpha target
`02e3475664241b612052b41b3dcfe4aefa2435ca` on
`cycle/34-live-candidate`, against beta RC
`30168fb2848ac9dfe66ab57f87cc54007afa6818` and gamma R3
`0f92f476ce511499812621aa61d37f4acd377926`.

## Result: GO for the CDD collection repair only

`collectCandidate` now creates `candidate-receipt-v3.json` only after all 24
local records pass the exact predicate
`record && record.scorer && record.scorer.decision === "accepted"`.
Therefore a `rejected`, unknown, absent, or malformed decision cannot produce
a receipt. The check follows the complete collection loop: local prompt/raw
attempt evidence already written under `attempts/` remains available, while
the root receipt has not yet been written.

This is only a fake-client CDD admission-boundary GO. It is not a live
provider invocation, a CDR receipt, an effectiveness result, permission for a
network call, a merge, or a provider change.

## Independent evidence

- On a clean installation, `npm ci` completed (4 packages; audit reported no
  vulnerabilities).
- Focused fake-only commands all passed:

  ```
  npm run test:trusted-proof-live-candidate
  npm run test:trusted-proof-preflight
  npm run test:trusted-proof-answering
  npm run test:cdr-receipt-intake:v3
  npm run test:cdr-matrix
  npm test
  ```

- The positive fake matrix makes exactly 24 response calls, writes 24 records
  in sorted case `P0,P1` order, has all decisions `accepted`, and validates as
  `candidate-integrity-valid-not-a-result-v3`.
- The all-rejected and one-rejected/otherwise-accepted fake matrices each
  make all 24 calls, retain `attempts/`, and reject with no
  `candidate-receipt-v3.json`. The strict exact comparison above also covers
  missing, non-object, unknown, and otherwise malformed `scorer.decision`;
  no model response can manufacture an alternative accepted spelling.
- Existing focused boundaries still reject before receipt emission: unequal E,
  response model/usage failures, sealed-prompt leak, and failed trusted proof.
  A pre-existing root rejects before client construction. Default CLI remains
  offline and reports `provider_calls: 0`; incomplete live CLI gates also fail
  before a client can be used.
- `git diff --check origin/main..HEAD` passed. The alpha repair changes only
  the collector and its fake test. It does not modify `.cdr/**`, CDR method or
  schema, pinned transport, preflight/answering implementation, fixture
  oracle, or default provider/network behavior.

## Scope and remaining boundary

The v3 validator still validates integrity rather than experiment eligibility;
that is unchanged by design. This collector is now the required local
admission boundary before it emits a candidate for that validator. Its output
remains explicitly an integrity candidate, never an aggregate or result.
