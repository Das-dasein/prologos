# Beta CDR review r1 — issue #52 v7 status alignment

Verdict: **REVISE**

Reviewed alpha commit: `af116c6f17ad8c829855c060e69f2fe5e29cdd31`
(`cdr: align v7 authority status`), against parent
`374ded899fdb1bc91af0ac17d53dd3991086b95d`.

## Scope and identity

- `git show --format=fuller --stat` reports author and committer as
  `alpha <alpha@prologos.cdd.cnos>` for the reviewed commit.
- The exact diff changes only the two files allowed by the gamma scaffold:
  `.cdr/waves/cognitive-proof-eval-v1/manifest.md` and
  `.cdr/waves/cognitive-proof-eval-v1/status.md` (44 insertions, 8 deletions).
  No implementation, registry, config, hash, transport, evaluator, dataset,
  or outcome artifact changed. `git diff --check` passes.
- The stated v7 authority is accurate: the checked-in v7 builder pins authority
  commit `7f0a58cddd0966c8b1834f66ece726d2b60d184e` and exactly
  `providers/openai-answering.js` plus `trusted-proof-answering.js` in
  `WIRE_SOURCES`. `trusted-proof-live-candidate.js` imports the v7 validator
  and loads `trusted-proof-live-candidate-config-v7.json`; neither is an added
  v7 wire-authority source.
- Both documents preserve the strict preparation boundary: no provider call,
  candidate receipt, CDR receipt, result/aggregation, or effectiveness claim.

## Blocking inherited-gate regression caused by this documentation edit

The claimed historical-source wording is semantically appropriate, but it
removes the exact token sequence still required by the inherited v2 validator:

```js
const sourceCommit = (manifest.match(/Source implementation snapshot: `([0-9a-f]{40})`/) || [])[1];
```

Consequently the new manifest produces an undefined `sourceCommit`, then
`trustedInputs` rejects the unchanged v1 actual-prompt registry with
`receipt-intake-v2: actual prompt digest registry binding mismatch`. This is
not a provider interaction and happens before a collector could make one.

Fresh offline evidence at alpha commit:

```text
git diff --check 374ded899fdb1bc91af0ac17d53dd3991086b95d af116c6f17ad8c829855c060e69f2fe5e29cdd31  # pass
npm run test:trusted-proof-live-candidate  # fail: receipt-intake-v2 ... binding mismatch
npm run test:cdr-receipt-intake:v7         # fail: receipt-intake-v2 ... binding mismatch
```

Control evidence from an isolated detached worktree at parent
`374ded899fdb1bc91af0ac17d53dd3991086b95d`:

```text
npm run test:trusted-proof-live-candidate  # pass: trusted-proof-live-candidate ok
npm run test:cdr-receipt-intake:v7         # pass: receipt-intake-v7-self-test-ok
```

Thus this is not an inherited provenance-binding defect preceding α: it is a
documentation-to-validator compatibility regression introduced by the exact
manifest rewrite. The v7 authority/status statements themselves are accurate,
and no live call was made in this review. However, required no-live collector
and v7 intake evidence no longer passes, so #52 cannot receive GO until the
historical-source wording preserves the parser-compatible binding (or a
separately scoped, validated intake change deliberately removes that coupling).
