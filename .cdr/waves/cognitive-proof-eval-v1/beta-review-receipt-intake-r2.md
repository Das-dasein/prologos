# CDR beta review R2: local receipt intake (issue #32)

Role: fresh independent CDR beta review. Reviewed exact alpha target
`83e3c7286ea756a36d22a0b9d7e4c67695722b33` against gamma repair
`a94c87ffd749e9fc85b3f8ec649b4e8ed19eaf52`, the previous beta finding
`7726550169b6a39da61d116f25c53dd231c54519`, `.cdr/POLICY.md`, the wave
manifest/method/status, receipt-intake specification/schema/synthetic fixture,
and both the intake and trusted-proof validators. This beta is not alpha,
gamma, delta, a provider operator, or a scorer.

## Verdict

**GO_PREPARATION — issue #32 R1 repairs the prior P1 proof-binding finding.**
This is a local deterministic intake-preparation verdict only. It is not a CDR
receipt, approval of a live run, threshold result, observed/computed
effectiveness result, or PAM usefulness conclusion. The wave remains limited
to its existing offline-method state, and `prolog-memory-eval-v0` remains
unchanged and `REVISE`.

## Exact repair and policy alignment

The prior beta found that an arbitrary valid-format P1 SHA-256 was accepted:
there was no case-specific canonical proof binding. The alpha delta adds the
closed-world `trusted-proof-digest-registry-v1.json`, containing the pinned
source commit, dataset path/hash, every case digest, and canonical self-hash.
The intake envelope binds that registry hash; `trustedInputs()` rejects bad
field shape, protocol, source/dataset binding, self-hash, missing/extra case
keys, and malformed case digest. `validateRecord()` requires P1 to equal the
digest for its own `case_id`; P0 remains required to carry `null`.

This is consistent with the policy distinction between a reproducible
implementation gate and a usefulness claim: the intake remains local and
non-aggregating, records no raw response in the repository, and says that even
an integrity-valid candidate is not a result without the separate human run
and fresh beta audit.

## Clean reproduction and independent integrity checks

At the reviewed target, from a clean dependency install, all required commands
passed:

```text
npm ci
npm run test:cdr-receipt-intake
node .cdr/waves/cognitive-proof-eval-v1/validate-receipt-intake-v1.js \
  .cdr/waves/cognitive-proof-eval-v1/receipt-intake-v1.synthetic.json
node .cdr/waves/cognitive-proof-eval-v1/validate-trusted-proof-eval-v1.js
npm test
```

The focused self-test returned `receipt-intake-v1-self-test-ok`; the committed
fixture returned `synthetic-valid-not-aggregable` with two records; and the
trusted symbolic validator returned `offline-symbolic-ok` for all 12 cases.
`npm test` passed, ending with the trusted-proof preflight's no-live gates.

Independently recomputed dataset SHA-256:

```text
63d68d4decad2dcdadbfc1204c58cec2650a46a90442cb63889e3d7989e07e51
```

It equals the manifest and registry binding. `git cat-file -e` confirmed the
registry's source snapshot `82bcc82fca8d8ebb2734e1006b754a6d4e31b4ac`
exists. The trusted-proof validator recomputed all 12 canonical
`runTrustedQuery` results and their stable digests, matched each registry
entry, checked that registry keys exactly equal dataset case IDs, and matched
the registry self-hash
`a68d6a010b7225f42bedb447a209e50617cd26bf2a9a6ab40aa0d40b61ae42e4`.
The target delta is whitespace-clean under:

```text
git diff --check a94c87ffd749e9fc85b3f8ec649b4e8ed19eaf52 \
  83e3c7286ea756a36d22a0b9d7e4c67695722b33
```

## Independent falsifiers

Using the committed synthetic P1 record for `multi_hop_01`, beta mutated the
digest while retaining valid SHA-256 format. Both values were rejected with
`trusted proof digest does not match case registry`:

- arbitrary `"f".repeat(64)`;
- the genuine registered digest for a different case, `multi_hop_02`.

Beta also supplied the validator an in-memory tampered registry, without
modifying the checkout. It rejected a changed digest with stale self-hash as
`trusted proof digest registry self-hash mismatch`. It also rejected a
rehash-consistent source-commit mutation and a rehash-consistent dataset-hash
mutation, each as `trusted proof digest registry source/dataset binding
mismatch`. These falsifiers directly cover the prior finding and the
registry's self/source/dataset bindings.

## Retained boundaries

The target changes only the issue #32 local receipt material: report,
manifest/method/status, schema/specification, synthetic fixture, digest
registry, and deterministic validators. Inspection of the intake validator
shows only Node standard-library imports (`assert`, `crypto`, `fs`, `os`, and
`path`); it contains no provider/model/SDK/network/scorer call. Candidate raw
bytes remain accessible only through an operator-supplied `local://` reference
under `--raw-root`, with path containment and SHA-256 verification; the
committed fixture's raw references are intentionally nonexistent. No provider
call, network operation, model invocation, raw live output, aggregate, CDR
receipt, or positive effectiveness claim was executed or introduced. No file
under `prolog-memory-eval-v0` is changed by the alpha target.

Future work still must run the human-operated comparison, retain its local raw
evidence, measure equal provider-side `E`, enforce live prompt-leakage gates,
and obtain a new independent CDR beta audit before any result or claim. This
GO_PREPARATION does not relax any of those requirements.
