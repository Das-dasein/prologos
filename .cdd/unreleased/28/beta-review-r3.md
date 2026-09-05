# Beta review R3: cycle 28 portable trusted-proof preflight

Target reviewed: `a5fcd5abfc3d3d42c8e274b16cfef3719581985b` (`cycle/28`).
Repair reviewed: `c62ec2dc2add1beb9a0668c2bd260afbc53f01ec`.

## Verdict: GO — portable fake-only harness only

This β verdict approves neither a live provider execution nor a CDR receipt,
effectiveness claim, merge, or issue closure. It approves the targeted repair:
the portable test replaces the macOS-only trusted-runtime invocation with a
deterministic injected trusted-query fixture, while retaining the P0/P1 call
boundary and provenance checks.

## Independent reproduction

| Check | Result |
|---|---|
| Install and suites | PASS: `npm ci`, `npm run test:trusted-proof-preflight`, and `npm test` all passed. |
| Platform-neutral focused test | PASS: after overriding Node's reported platform to `linux`, `require('./test-trusted-proof-preflight.js')` completed successfully. This is a process-level Linux compatibility simulation, not a claim of an actual Linux live runtime. |
| Fail-closed trusted runtime | PASS: under the same simulated Linux platform, direct `runTrustedQuery` rejected with `capability-empty runtime unavailable: macOS sandbox-exec is required`. No fallback was observed. |
| Fake-only boundary | PASS: the focused test injects its deterministic trusted result only through `trustedQuery` in the test. Its injected provider is counted; P0 makes zero trusted calls, P1 exactly one, and all successful transports are fake. Static inspection finds no provider SDK, `fetch`, URL, or default transport in the harness/test. |
| P0/P1 provenance and sealing | PASS: equal outside-slot material and neutral P0 slot are asserted; P1 carries the registered slot. Frozen nested mutation and reconstructed/forged P1 reject before the counted fake provider. |
| Leak, retry, equality, records | PASS: P0/P1 outside-slot oracle leaks abort before transport; retry absence/mismatch and unequal measured E reject before scoring; equal fake E has matching digest; raw/envelope output is exclusive/non-overwriting and preserves result provenance. |
| Scope | PASS: `git diff --check c62ec2d..a5fcd5a` passed. Target delta is only self-coherence and focused test; `.cdr/**` has no change. No provider/SDK/live path, CDR artifact, receipt, or claim appears. |

## Boundary retained

`assembleCondition` still defaults to `runTrustedQuery` outside this test, and
that implementation remains fail-closed unless macOS `sandbox-exec` exists.
The new fixture does not turn that runtime into a Linux capability; it isolates
the harness unit test from it. Actual macOS trusted-runtime integration, any
provider/token measurement, a human live run, raw-live review, and fresh CDR
review remain deferred.
