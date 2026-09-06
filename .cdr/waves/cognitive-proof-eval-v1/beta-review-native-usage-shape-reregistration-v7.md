# CDR beta review: native-usage shape re-registration v7

Reviewed alpha commit `b0347f6e3271a9db620ac6cc85e0c928563dd9a4`
against gamma scaffold `ac12d2eeb0853540044c2bea143ca13933c8eaae`.

## Decision

**GO_PREPARATION** for the bounded receipt-v7 re-registration. This is a
forward-only local receipt/registry identity after the PR #48 transport repair;
it is neither live-provider authorization nor a collection, aggregation, or
effectiveness result.

## Independent evidence

- `7f0a58cddd0966c8b1834f66ece726d2b60d184e` is an ancestor of the reviewed
  alpha commit. Independent SHA-256 values of the two explicitly owned wire
  sources equal the sealed v7 values: `providers/openai-answering.js` =
  `bb8ffb58fa39930ff3656f4c73091b27dd452c7654ab37b1514e61726f941299` and
  `trusted-proof-answering.js` =
  `b19e21499fb279f67be53b9ce425425d0c5f10f12f65e6cc23c746fbc4d62911`.
- A fresh v7 registry build parsed identically to the committed registry and
  retained sealed registry SHA-256
  `8c5e02858762443052cf1e04e49a8189c3812bf10484cc76e3725ed1314aa7af`.
  The generated textual file has one additional terminal blank line only.
- `node .cdr/waves/cognitive-proof-eval-v1/validate-receipt-intake-v7.js
  --self-test` passed. It rejects v1 through v6 identifiers; fixes the exact
  `temperature`/`top_p` sampling mapping; seals prompt digests and both source
  hashes; and retains v2 record, proof, raw-artifact and leak checks.
- Independent fixture mutations rejected `NaN` and unsafe native counters,
  a wrong P1 trusted-proof hash, duplicated raw artifact reference, and an
  oracle-like scorer field. This exercises native-usage, proof, artifact, and
  anti-leak boundaries without creating a provider request.
- `npm run test:trusted-proof-answering` passed using fake clients only. It
  accepts realistic SDK usage details (`cache_write_tokens`, `cached_tokens`,
  `reasoning_tokens`) then retains only canonical counters; unknown or malformed
  detail shape rejects before metadata is written.
- `npm test` and `git diff --check 7f0a58c..HEAD` passed. The alpha diff adds
  v7-local registry/validator/schema/fixture/documentation and a test script;
  it does not edit the provider, preflight, answering, dataset, policy, or
  collector runtime.

## Boundary

No network, provider/model invocation, credentials, raw live artifact, receipt
collection, result, or merge was performed in this review. The older v5/v6
source registrations deliberately remain stale after the transport repair;
v7 is the new forward-only authority and must not be read as making an older
receipt valid.
