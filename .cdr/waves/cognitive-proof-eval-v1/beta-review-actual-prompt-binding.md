# CDR beta review: actual assembled-prompt binding (issue #35)

Role: fresh independent CDR beta review. Reviewed exact alpha target
`883e310eef63d6b09fdd313816c92064bf9b6f14` against gamma scaffold
`fa2d4b9bf22914ddd5fd31ca06f3769cb7ec83c2`, `.cdr/POLICY.md`, the wave
manifest/method/status, v1 and v2 receipt-intake specifications and fixtures,
the slot/proof/prompt digest registries, and the builder and validators. This
beta is not alpha, gamma, delta, a provider operator, or a scorer.

## Verdict

**GO_PREPARATION — issue #35 closes the local receipt-intake gap for actual
assembled P0/P1 prompt bytes.** This is an offline deterministic preparation
verdict only. It is not a CDR receipt, approval of a live run, a threshold
result, an observed or computed effectiveness result, or a PAM usefulness
conclusion. The existing wave state is unchanged and
`prolog-memory-eval-v0` remains unchanged and `REVISE`.

## Exact binding reviewed

V2 is separate from v1 and rejects a v1 schema envelope rather than upgrading
or reinterpreting it. Its self-hashing closed-world registry binds all 12
pinned case IDs and both P0/P1 SHA-256 values to the pinned source, dataset,
slot registration, proof-digest registry, and synthetic no-live template
identities. `trustedInputs()` verifies its closed shape, self-hash, inputs,
case mapping, and an independent rebuild through the existing sealed P0/P1
assembler. Each candidate record must bind the exact registered digest for its
case and condition; its local prompt artifact must hash to that same record
digest. Prompt and raw references are unique and resolve only below the
operator-supplied `--raw-root`.

The v2 specification and code preserve the pre-existing snapshot/query/slot,
P0-null/P1-canonical-proof, retry/run, equal-`E`, oracle/control-leak, and
no-supersedes gates. Synthetic input remains explicitly non-aggregable.

## Clean reproduction and registry rebuild

At the reviewed target, a clean dependency install and all requested checks
passed:

```text
npm ci
npm run test:cdr-receipt-intake:v2
npm run test:cdr-receipt-intake
node .cdr/waves/cognitive-proof-eval-v1/validate-trusted-proof-eval-v1.js
node .cdr/waves/cognitive-proof-eval-v1/validate-equal-budget-slots-v1.js
npm test
```

The v2 and v1 self-tests returned respectively
`receipt-intake-v2-self-test-ok` and `receipt-intake-v1-self-test-ok`; the
symbolic and equal-slot validators passed all 12 cases; and the full suite
ended with the trusted-proof preflight's no-live gates.

Beta independently ran the prompt-registry builder and compared its JSON
output byte-for-byte with the committed registry. It reproduced all 12 P0/P1
case mappings and the committed/self SHA-256:

```text
198bcd6ab78bcee84c3b3333ba88c6f38e0362dd398ba7e083370a2db8da5e05
```

`git diff --check fa2d4b9bf22914ddd5fd31ca06f3769cb7ec83c2
883e310eef63d6b09fdd313816c92064bf9b6f14` passed.

## Independent falsifiers

In-memory mutations, without changing the checkout, were rejected before any
aggregation:

- a syntactically valid but wrong `prompt_sha256` and a P0/P1 digest swap;
- a v1 envelope supplied to the v2 validator;
- a changed local prompt byte outside the slot and a prompt artifact SHA that
  differed from its record SHA;
- shared prompt references, shared raw references, and a cross-kind shared
  prompt/raw reference;
- an oracle field in a scorer object;
- a changed registry digest with a stale self-hash;
- a rehashed template-identity mutation, because the registry no longer
  reproduced from the sealed no-live assembler.

These outcomes cover the gamma-required prompt, artifact, registry,
version-separation, duplicate-reference, and retained leak gates. Candidate
input is also incomplete unless every registered case has exactly one P0/P1
pair with equal immutable binding and measured `E`.

## Retained boundaries

Inspection found the new builder and intake use only local Node facilities and
the existing no-live sealed assembler. No provider, network, model, SDK,
transport, scorer, live raw output, aggregation, CDR receipt, or
effectiveness claim was called, added, or inferred. The registry contains only
digests and template identities, not raw prompt bytes, oracle contracts, or
raw responses; candidate artifacts are read locally under `--raw-root` only.
No v0 artifact was altered.

A later human-operated run must still retain and review local evidence,
measure provider-side equal `E`, enforce live prompt-leakage aborts, and
receive a fresh independent CDR beta audit before any result or claim. This
GO_PREPARATION relaxes none of those requirements.
