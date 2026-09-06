# Beta R2 review: CDR wire-authority repair v5 (issue #44)

## Independent target and scope

Fresh independent CDR beta review of alpha target
`6e662682154d4005b0f0516e6e0d3673224c8487` against gamma scaffold
`f24bb217eed0941e4f0fac1e1d4877fe2e81b934`.

The target descends from the gamma scaffold.  It is forward-only v5 receipt
preparation: registry, schema, synthetic fixture, validator, documentation,
and an npm test command.  It does not modify v4 history, provider behavior,
collector code, data, oracle, threshold, policy, scoring, aggregation, or a
live-result artifact.

## Reproduction and retained gates

On the checked alpha target I ran:

```text
npm run test:cdr-receipt-intake:v5
# receipt-intake-v5-self-test-ok

buildRegistry() == committed v5 registry
# byte-for-byte equality, including self-hash and all P0/P1 prompt digests

npm run test:trusted-proof-preflight
npm run test:trusted-proof-answering
npm run test
# all passed

npm run test:cdr-receipt-intake:v4
# receipt-intake-v4-self-test-ok
```

The v5 authority source map is exactly and only:

```text
providers/openai-answering.js
trusted-proof-answering.js
```

The sealed assembler is instead explicitly identity-bound, together with the
literal base/wrapper template identities.  This neither turns it into a third
transport source nor permits an unsealed prompt.

The v5 self-test retained rejection coverage for v1--v4 envelopes, extra or
out-of-bounds sampling, input-mode drift, prompt-digest swapping, authority
map/template/sampling drift, and raw-artifact hash mismatch.  The v2-derived
validation path retains proof, source/dataset/slot/retry, pair/equal-E,
duplicate/overwrite, and leakage gates.

## Independent mutation rerun

I independently monkey-patched only local file reads during registry rebuilding
(no files were changed and no provider/network/model was called).

* Appending distinct content to `trusted-proof-live-candidate.js` and to
  `trusted-proof-live-candidate-config-v3.json`, one at a time, produced the
  identical v5 registry.  Neither is read or pinned as source authority.
* Appending content to each of the two listed wire sources, one at a time,
  made rebuilding reject with the pinned-transport SHA-256 mismatch.

Thus the repair removes the collector self-pin while preserving detection of a
real transport-source drift.  The synthetic fixture remains non-result; this
review makes no effectiveness or live-collection claim.

## Verdict

`GO_PREPARATION`.

Approval is solely for deterministic v5 authority-bound receipt preparation.
It is not authorization for provider collection and is not evidence of model
or method effectiveness.
