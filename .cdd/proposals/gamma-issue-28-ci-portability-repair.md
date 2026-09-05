# Gamma repair R3: keep no-live preflight tests platform-neutral

Issue: #28  
Input: PR #31 CI failure on Linux at alpha/beta-approved macOS target.

## Finding

`test-trusted-proof-preflight.js` injects `runTrustedQuery` itself while
testing harness assembly. The trusted runtime is correctly fail-closed outside
macOS Seatbelt, but this turns a fake-only, transport-injection test into a
platform-specific runtime test. GitHub Actions Linux therefore fails at
`capability-empty runtime unavailable: macOS sandbox-exec is required`.

## Repair

- In harness-unit tests, inject a deterministic trusted-query double returning
  the fixture's already trusted expected result; assert call counts and
  provenance exactly as before. This tests the harness boundary, not Seatbelt.
- Preserve a macOS-only integration path for actual `runTrustedQuery`; do not
  introduce a permissive Linux fallback or claim cross-platform capability-
  empty execution.
- CI must run the portable fake-only suite without requiring `sandbox-exec`.
  Platform availability/debt stays explicit in self-coherence.

No provider, SDK, network call, CDR artifact/claim, dataset change or live
execution is authorized.
