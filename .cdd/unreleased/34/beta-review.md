# Beta review: issue #34 OpenAI answering transport — RC

Reviewed α target `fa895545132211c6f41aac70e67a33ebdbceae7a` against γ scaffold
`1078ac731539611a758b27976b972b1aad36e2b4` on a fresh β session.

## Result: RC

The target must not receive GO yet. Two native-response boundary cases violate
the γ requirement that the adapter return the selected model or fail, and that
native usage be valid rather than merely arithmetically reconciling.

1. `providers/openai-answering.js:nativeUsage` accepts negative values. A
   fake response `{ input_tokens: -1, output_tokens: 2, total_tokens: 1 }`
   is normalized successfully. `effective_context_budget` consequently becomes
   `-1`; the later preflight layer rejects it only after the provider call.
   Reject negative native token values inside `nativeUsage`.
2. `complete` accepts a response with absent (or falsy) `response.model`
   because it checks `response.model && response.model !== config.model`.
   A response without a returned model is accepted, contrary to the pinned
   selected/returned-model contract. Require a non-empty returned model equal
   to `config.model`.

Both failures were reproduced with fake clients only; no real provider was
called.

## Passing evidence

- `npm ci` completed: 4 packages added, audit reported 0 vulnerabilities.
- `npm run test:trusted-proof-preflight` passed.
- `npm run test:trusted-proof-answering` passed.
- `npm test` passed, including both trusted-proof suites.
- `git diff --check 1078ac731539611a758b27976b972b1aad36e2b4
  fa895545132211c6f41aac70e67a33ebdbceae7a` passed.
- Independent fake-only early-gate checks for invalid provider, missing opt-in,
  invalid config, relative raw directory, and missing raw-directory parent
  all threw with client and request counters at zero.
- The existing fake test confirms exact `{ model, input: assembled.prompt }`
  forwarding, runtime literal-template hashes, E from `input_tokens`, P0/P1
  mismatch rejection before scoring, exclusive local artifacts, and a sealed
  pre-call leakage rejection.

## Scope audit

The target changes no `.cdr/**` file and does not alter historical v0
artifacts. This β review made no provider/model invocation, credential use,
raw live-output write, CDR receipt claim, effectiveness claim, merge, or issue
state change. Output remains explicitly labelled `not-a-cdr-receipt-v2`.
