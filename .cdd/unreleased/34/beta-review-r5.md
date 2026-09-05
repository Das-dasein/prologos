# Beta review R5: issue #34 sampling-to-wire repair — GO (CDD scope only)

Fresh independent CDD beta reviewed immutable alpha target
`c18d6c247269b1dc1821d4c5e0122fed7d158bfb` against gamma repair R4
(`.cdd/proposals/gamma-issue-34-sampling-repair-r4.md`) and predecessor
`6484d98aa90123c09ca2ebf48f459223b9328040`.

## Verdict

**GO for the bounded CDD sampling-to-wire repair.** This is not a CDR
re-registration, live-provider run, credential/network check, result claim,
merge decision, or permission to collect a candidate.

## Independent evidence

- A clean `npm ci` completed with four packages and no reported
  vulnerabilities. Focused preflight, answering, and live-candidate tests,
  both default CLIs, `npm test`, and `git diff --check` passed.
- `canonicalSampling` admits only an own-key object with exactly finite numeric
  `temperature` in `[0, 2]` and `top_p` in `[0, 1]`. Independent probes covered
  `seed`, missing and other extra keys, `NaN`, and both low/high range
  violations. Each rejected before client-factory invocation and before the
  requested raw/root directory existed.
- An independently captured fake call was exactly
  `{ model, input: assembled.prompt, temperature, top_p }`, including endpoint
  values `temperature: 2` and `top_p: 0`; the sealed prompt was unchanged. The
  client stayed lazy until `run`, and importing the transport/answering/
  collector modules created no default client. Both default CLIs returned
  `offline-no-default-provider` with zero provider calls.
- The config template and fake transport configs no longer contain `seed`.
  No provider, key, network request, result, CDR artifact, or CDR source/
  registry file was changed by this alpha diff.

## CDR v3 boundary and debt

The existing v3 registry intentionally pins the old bytes of
`providers/openai-answering.js` and `trusted-proof-answering.js`. The repaired
source hashes differ, so `collectCandidate` fails before client-factory
construction and before root creation with the precise expected error:
`providers/openai-answering.js does not match pinned transport source`.
That is the sole reached v3 gate for an otherwise valid configuration: it is
the required fail-closed transport-source drift, not a sampling, provider,
model, root, or receipt failure. Alpha correctly labels the state
"CDR re-registration required" and does not call it v3-valid or live-ready.

A separately authorized CDR v3 transport-source re-registration and fresh CDR
beta review remain required before any human opt-in collection can be treated
as CDR evidence.
