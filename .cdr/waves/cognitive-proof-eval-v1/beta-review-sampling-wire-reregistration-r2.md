# Beta R2 review: CDR receipt v4 sampling-wire re-registration (issue #42)

## Scope and independence

Fresh independent CDR beta review of alpha target
`ad1f6c2d81a79d7b9628421956b7f8a415ea46a4` against gamma scaffold
`31e014bd93de3b062a8b42fef9c9f3d730cac65d`.  This artifact supersedes
neither history nor any earlier review: the former commit `6e6b4cd` has an
alpha identity and is non-authoritative for this review.

The target adds only forward-only v4 registry, intake schema/fixture,
validator, documentation, and npm command.  It does not alter the existing
v3 collector, dataset, oracle, threshold, scoring, aggregation, or provider
policy.

## Reproduction

Executed on the reviewed checkout:

```text
npm run test:cdr-receipt-intake:v4
# receipt-intake-v4-self-test-ok

npm run test:cdr-receipt-intake:v2
# synthetic receipt inherited gates: receipt-intake-v2-self-test-ok

npm test
# complete baseline suite passed
```

The v4 builder was independently run and deep-compared with committed
`sampling-wire-assembled-prompt-digest-registry-v4.json`; the rebuilt object
is identical, including its self-hash, PR #41 merge commit, all four
wire-source hashes, literal template identities, exact sampling contract, and
all sealed P0/P1 prompt digests.

An independent mutation matrix called `validateEnvelope` against the committed
synthetic fixture.  Every mutation rejected before any candidate result could
be accepted:

| Gate | Mutation |
| --- | --- |
| Sampling | extra `seed`; missing `top_p`; `temperature=2.01` |
| Source | `source_commit` changed; v4 registry hash changed |
| Wire/prompt | P0/P1 prompt hashes swapped |
| Old format | envelope schema changed to v3 |
| Inherited receipt gates | duplicate raw artifact ref; retry attempts changed |

The built-in v4 self-test additionally rejects `NaN`, negative `top_p`,
run-binding drift, input-mode drift, registered source-hash drift, and wire
sampling-map drift.  It is therefore not dependent on only the external
mutation set above.

`npm run test:cdr-receipt-intake:v3` now fails closed because its predecessor
registry pins the pre-PR #41 `providers/openai-answering.js` hash.  This is the
specified incompatibility: v1/v2/v3 receipts are not upgraded or re-used by
v4.  It is not a regression in a v3 live collection claim.

## No-live boundary

The v4 builder reconstructs sealed prompt digests from immutable local inputs.
Static inspection of both new v4 modules found no `openai` import, `new
OpenAI`, `responses.create`, `fetch`, or client-factory invocation.  The
executed v4/v2 tests use the synthetic non-result fixture.  No provider,
model, network, raw live output, scoring, or aggregation was called or
produced in this review.

## Verdict

`GO_PREPARATION`.

This accepts only the deterministic, local v4 receipt-intake preparation and
its fail-closed wire/sampling registration.  It is not evidence of model
effectiveness, a live run, or permission to emit a v4 candidate receipt; that
requires a later CDD change to the untouched collector and a new review.
