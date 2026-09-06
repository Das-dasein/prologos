# CDR beta review: PR #41 sampling-wire receipt re-registration (issue #42)

Role: fresh independent CDR beta review. Reviewed exact alpha target
`ad1f6c2d81a79d7b9628421956b7f8a415ea46a4` against gamma scaffold
`31e014bd93de3b062a8b42fef9c9f3d730cac65d`, PR #41 merge
`97df020eeffd83df9eaaec4608056046a8ff6198`, `.cdr/POLICY.md`, and the
v1--v4 intake/registry/transport/collector boundaries. This beta is not
alpha, gamma, delta, a provider operator, or a scorer.

## Verdict

**GO_PREPARATION.** This is a forward-only, offline v4 registration of the
PR #41 answering wire. It is not a receipt, a live-run approval, an aggregate,
a threshold result, an effectiveness claim, or a PAM usefulness conclusion.
The existing wave result state remains unchanged and `REVISE`.

## Independently reproduced bindings

I derived the literal identities directly from the strings, not only their
exports:

```text
sha256("{{assembled_prompt}}") = 8df2ced7953c5f9f3e58ad6e416356c7674f7c2774d3281735bf674e71907c38
sha256("none")                 = 140bedbf9c3f6d56a9846d2ba7088798683f4da0c248231336e6a05679e4fdfe
```

I independently SHA-256 hashed the current sources and checked the transport
byte at the PR #41 merge. The registry pins these exact current bytes:

```text
providers/openai-answering.js                  4d1ebbceac69cade8c48339a9136ba15e73cb2032b74436f1c4f2a317466cf53
trusted-proof-answering.js                     b19e21499fb279f67be53b9ce425425d0c5f10f12f65e6cc23c746fbc4d62911
trusted-proof-live-candidate.js                10d5a7517e50292b7bd2162e0c4168773359c4e460fad31547e9409b40df1e92
trusted-proof-live-candidate-config-v3.json    365c791f7bcf09a4a1e6db8bd40cbbcfbac664773489a8f198aa3d1b4e61ffed
```

The current transport hash equals its PR #41 merge byte hash. A fresh sealed
rebuild produced the committed v4 registry under stable JSON comparison,
including all 12 P0/P1 mappings and its self-hash:

```text
fcab9aa10a390690e1b74cd33e63d06d1dfd99195d90b9d4142ee4a9c812be7d
```

## Reproduction and falsifiers

Clean `npm ci` completed with no vulnerabilities. `npm test`, v1, v2, v4,
preflight, answering, live-candidate, symbolic, equal-slot, annotation,
gold, and matrix checks passed. `git diff --check` from gamma to alpha passed.

The historical v3 self-test deliberately fails closed at HEAD: its registry
pins the predecessor `providers/openai-answering.js`, while PR #41 changed
that source. This is the expected stale-wire outcome stated by gamma, not a
v4 acceptance. The unchanged collector is also inert without live gates
(`offline-no-default-provider`, `provider_calls: 0`), and a v3 receipt format
is rejected by v4 before validation.

Without modifying tracked files, an independent in-memory v4 mutation matrix
rejected v1/v2/v3 schemas; sampling `seed`, missing/extra keys, non-finite
value, and both range violations; source and request-mapping drift; input-mode
drift; P0/P1 prompt-digest swap; registry artifact self-hash tamper; P0 proof,
missing P1 proof, unequal measured E, oracle leakage, duplicate record/ref,
and in-place overwrite. V4 delegates the inherited local artifact/hash,
immutable pair/retry, and leakage gates through its private v2 view.

## Retained boundaries

The v4 builder uses local files, the sealed assembler, and a module whose
OpenAI SDK import is lazy. It creates no provider or client and makes no
network or model call. The registry and synthetic non-result fixture contain
only identities/digests, not prompt bytes, raw output, oracle material, a
candidate receipt, aggregation, policy threshold, v0 change, or effectiveness
claim. The collector was not changed.

A later CDD change must update receipt emission/binding before any v4 live
candidate can exist; that run still requires local artifacts, exact measured
equal E, leak checks, and a fresh independent beta review. This
`GO_PREPARATION` relaxes none of those gates.
