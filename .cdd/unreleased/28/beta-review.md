# Beta review: cycle 28 R2 — trusted-proof preflight

Target reviewed: `12916abeca57e62d62d01c8178578dcf94d0a300` (`cycle/28`).

## Verdict: GO — harness behavior only

This is an engineering preflight verdict, not a CDR receipt, PAM claim, or
live-run approval. The target seals the exact assembly object in a
module-private `WeakMap`, recursively freezes its public graph, and uses the
private provenance—not public `pair` metadata—to select the prompt passed to
the injected transport. That blocks the R1 paired forged-slot bypass before
the provider is called.

`WeakMap` is correctly bounded here: it establishes provenance for this
harness's normal API path, but is not a security sandbox against arbitrary
hostile JavaScript executing in the same Node process.

## Independent evidence

| Check | Result |
|---|---|
| Exact target and scope | PASS: HEAD is the stated SHA; parent diff is limited to the harness, its focused test, and alpha self-coherence. `git diff --check HEAD^ HEAD` passes. No `.cdr/**` mutation, receipt, PAM/live claim, merge, or issue closure appears in the target. |
| Focused harness suite | PASS: `node test-trusted-proof-preflight.js`. |
| Project suite | PASS: `npm test`. |
| Default/no-live CLI | PASS: `node trusted-proof-preflight.js` emits `offline-preflight-only` and `provider_calls: 0`. `--allow-live-provider` without JSON config rejects; the supplied non-JSON manifest also rejects, and no adapter invocation exists. Static inspection finds no provider SDK or network transport in the harness/test. |
| P0/P1/PX boundaries | PASS with a fresh fake trusted runtime: P0 makes zero trusted calls, P1 exactly one, and PX requires an explicit P1 result and labels its transcript `UNTRUSTED_EXPLORATORY_TRANSCRIPT`. |
| Sealed hostile mutation | PASS: a direct nested `p1.pair.p1Slot` write throws on the frozen graph. A reconstructed P1 bearing a hidden-answer-padded forged slot and matching forged public pair rejects as `unsealed or reconstructed` before the counting fake provider; provider calls remain zero for the attack. A legitimate sealed P1 completes once. |
| Leak/equality/records | PASS: actual oracle-value outside-slot attacks reject before fake transport; canonical retry-policy absence/mismatch rejects; fake equal measured E produces equal digest and unequal E rejects before scoring. Raw/envelope writes are exclusive and retain the required references. |

The focused test also covers hidden-contract scoring, P0 neutral slot, slot-map
binding, non-overwrite, and explicit live-gate construction. Fake usage values
remain test doubles, not provider-token measurements.

## Deferred work

The real provider adapter/token measurement, human-operated run, live raw
review, and a fresh CDR beta remain deferred. No provider was called in this
review.
