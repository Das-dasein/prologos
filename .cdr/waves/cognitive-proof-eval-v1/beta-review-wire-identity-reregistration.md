# CDR beta review: real answering-wire identity re-registration (issue #38)

Role: fresh independent CDR beta review. Reviewed exact alpha target
`ac671c55901d232403b1eb4dc45ca65c84859544` against gamma scaffold
`6164711602d9300874048c47fc18c454bf66fdc1`, source PR #37 merge
`4b403d1775c3de727f4f2408cada2408435a849d`, `.cdr/POLICY.md`, and the
wave's v1/v2/v3 builders, registries, specifications, validators, preflight,
and answering transport. This beta is not alpha, gamma, delta, a provider
operator, or a scorer.

## Verdict

**GO_PREPARATION.** Issue #38 correctly adds a separate, forward-only local
v3 preparation format. This verdict is neither a CDR receipt nor approval of
a live run, aggregate, threshold result, effectiveness claim, or PAM
usefulness conclusion. `prolog-memory-eval-v0` remains unchanged and
`REVISE`.

## Independent identity and source verification

I independently SHA-256 hashed the literal wire strings, rather than relying
only on exports:

```text
sha256("{{assembled_prompt}}") = 8df2ced7953c5f9f3e58ad6e416356c7674f7c2774d3281735bf674e71907c38
sha256("none")                 = 140bedbf9c3f6d56a9846d2ba7088798683f4da0c248231336e6a05679e4fdfe
```

Both equal the exported `providers/openai-answering.js` identities and the
v3 registry's `no_live_assembler` and `wire_transport` identities. I also
independently hashed the two pinned files, then extracted and hashed their
versions at PR #37's merge commit. Current and PR #37 bytes match in both
cases:

```text
providers/openai-answering.js = 0f63008ed51a7e7414ecec762da4e3a29792af489b157e90f53302b4e2493d6a
trusted-proof-answering.js    = 4172a23477085d55c65c5d01460a452c938403cf9df76847dea5d82918f475a6
```

PR #37 is an ancestor of alpha and there is no later diff in either transport
source. The v3 builder reconstructed all 12 P0/P1 digests through the sealed
assembler; stable canonical comparison with the committed registry passed and
reproduced its self-hash:

```text
b77606570d7ea951767a328d1676a312521f78bbc6231aa8e03614b9fa463ac5
```

## Reproduction

Clean `npm ci` succeeded without vulnerabilities. The following passed:

```text
npm run test:cdr-receipt-intake
npm run test:cdr-receipt-intake:v2
npm run test:cdr-receipt-intake:v3
node .cdr/waves/cognitive-proof-eval-v1/validate-trusted-proof-eval-v1.js
node .cdr/waves/cognitive-proof-eval-v1/validate-equal-budget-slots-v1.js
npm run test:cdr-annotation
npm run test:cdr-gold
npm run test:cdr-matrix
npm run test:trusted-proof-preflight
npm run test:trusted-proof-answering
npm test
```

`git diff --check` over gamma-to-alpha passed. The alpha diff adds only the
v3 builder/registry/intake artifacts and narrow documentation/package-script
updates: it changes no dataset, oracle, raw/live artifact, aggregate, claim,
or v0 result.

## Independent falsifiers

Without changing tracked files, in-memory or temporary-local mutations were
all rejected before aggregation: v1 and v2 envelopes; synthetic v2 identity;
a different valid-format real wire hash; input-mode mismatch; P0/P1 digest
swap; recomputed registry binding tamper; stale registry self-hash; transport
commit tamper; and simulated transport-source byte drift.

The v3-to-v2 internal compatibility view retains the historical gates. I
separately confirmed rejection of an incorrect P1 proof hash, unequal P0/P1
measured `E`, oracle/control leakage, duplicate local raw reference, and an
altered local prompt artifact under `--raw-root`.

## Retained boundaries

The v3 builder imports only local Node modules, the sealed preflight assembler,
and the answering module that deliberately does not import the OpenAI SDK at
module load. It does not construct a client or provider and makes no network
or model call. Validator tests use synthetic/local evidence only. The registry
stores hashes and identities, never raw prompt bytes, raw provider output,
oracle material, a receipt, an aggregate, or an effectiveness result.

A future human-operated live run still requires its own local evidence,
provider-side measured equal `E`, leakage checks, and a new independent CDR
beta review. This `GO_PREPARATION` does not relax any CDR policy gate.
