# Beta review: cycle 28 R1 — trusted-proof preflight

Target reviewed: `8a8d2bcb64126bb82beb1ba54c2c39c7c6be8c04` (`cycle/28`).

## Verdict: REQUEST CHANGES

The R1 repair correctly covers literal P0 and P1 outside-slot oracle-value
injections and retry-policy identity in its ordinary assembly path. It does
not establish the required invariant that P1 evidence is only the trusted
serialization generated for the immutable fixture. The final transport
sentinel trusts caller-controlled `assembled.pair.p1Slot` rather than deriving
the permitted slot from immutable inputs and `trusted_result`.

## Reproduced blocker B-1: forged P1 slot reaches transport

In a clean archive of the target, build P1 using `assembleCondition`, then
replace the substring in `[slotStart, slotEnd)` with
`fixture.hidden_answer_contract.allowed` (padded to the original slot length)
and replace `pair.p1Slot` with the same value. Calling
`executeWithInjectedProvider` with a counting fake provider completes
successfully and prints:

```json
{"provider_calls":1,"injected_slot_accepted":true}
```

`leakGuard` accepts the forged value because the P1/PX condition is only
`slot === pair.p1Slot`; both fields come from the caller-controlled assembled
object. This bypasses the asserted exact-generated-serialization boundary
immediately before the sole transport call.

Repair the transport-time guard to recompute or cryptographically bind the
registered P1 slot from immutable dataset/registration, fixture, and the
trusted result generated for the request. Add the hostile paired mutation
above and assert zero provider calls. Do not relax P0, retry, no-live, or CDR
boundaries.

## Independently verified passes

| Check | Result |
|---|---|
| Exact target / scope | Clean archive of `8a8d2bc`; only harness, focused test, and alpha coherence change from base. No `.cdr/**` diff. |
| Focused test | PASS: `node test-trusted-proof-preflight.js` |
| Project suite | PASS after `npm ci --ignore-scripts`: `npm test` |
| Default CLI | PASS: outputs `offline-preflight-only` with `provider_calls: 0` |
| Live gate | PASS: `--allow-live-provider` without complete config rejects; no live invocation performed |
| Ordinary hostile values | PASS: P0 allowed-answer and P1 outside-slot allowed-answer reject before fake provider; P0 proof calls 0 / P1 calls 1; missing retry rejects; changed retry changes digest and rejects before scoring. |
| Equal-E / records | PASS: equal fake E gives equal digest; unequal E rejects before scoring; envelope/raw use exclusive write. |
| No CDR claim mutation | PASS: no dataset, method, threshold, receipt, or PAM claim changed. |

No provider SDK, network request, live provider, CDR receipt, merge, or issue
closure was invoked in this review. This is a beta engineering verdict only.
