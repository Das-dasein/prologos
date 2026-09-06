# CDR beta review: Codex exec receipt intake v8

Reviewed alpha commit `7204c70fed21dc3f995d11730e544026893b9d1d`
against `gamma-codex-exec-v8-scaffold.md`.

## Decision

**REVISE.**  The addition is a preparation-only, offline implementation and
does not make a live-result claim, but its v8 intake and collector do not yet
fail closed on several bindings required by the gamma contract.  It is not
ready for `GO_PREPARATION`.

## Blocking falsifiers

1. The validator accepts an arbitrary scorer object.  Offline mutation of the
   synthetic fixture to `{ decision: "fabricated", contract_sha256:
   "00...00", extra: true }` returned
   `synthetic-valid-not-aggregable-v8`.  The validator only requires that a
   `scorer` property exists; it never fixes its keys, accepted decision, or
   scorer-contract hash.  Thus a post-collection scorer mutation remains
   integrity-valid.
2. The validator accepts an incomplete condition set.  Replacing the synthetic
   fixture's 2 records with its single P0 record also returned
   `synthetic-valid-not-aggregable-v8`.  A candidate is therefore not required
   to contain exactly one P0 and one P1 for every registered case (24 records),
   despite the collector-side intent and the gamma requirement.
3. The sealed command says executable `codex`, but the collector forwards a
   caller-supplied `binary` unchanged and the adapter otherwise honors
   `CODEX_BIN`.  Its own offline happy-path test passes
   `binary: "never-real-codex"` and still obtains a receipt whose run command
   declares `executable: "codex"`.  Consequently the command receipt does not
   attest the invoked executable.  Remove the production override/environment
   path or make it an explicitly non-production fake-only seam that cannot
   produce a candidate receipt.
4. The collector checks only provider, source commit, dataset hash and slot
   registration digest before making its root.  It does not bind the complete
   v8 config to authority: notably sampling and retry policy may be mutated;
   the latter is silently replaced by the hard-coded receipt policy.  Require
   exact config shape and registered values, including the file digest and
   wire identities, and derive the run only from that validated config.
5. The intake schema is only a top-level shell, and the executable validator
   permits extra keys in run and records.  More importantly, the raw artifact
   is only a small JSON reference to separately written stdout/stderr/final
   files; intake hashes that reference but neither binds nor parses the actual
   JSONL completed event/final output.  Native usage in a candidate hence is
   not independently tied back to sealed raw Codex evidence.  Register and
   validate the raw event/output artifacts (or a sealed raw bundle), then
   recompute native usage and output-schema conformance from them.

## Non-blocking confirmed evidence

- The v8 registry rebuild reproduced the committed JSON payload and registry
  SHA-256 `a6ff01c19c1c94ae305da73d6f3dfeb3a66a7b9773354e984f33325771579e0a`;
  only an additional terminal blank line differed.
- `validate-codex-exec-receipt-intake-v8.js --self-test`,
  `npm run test:trusted-proof-codex-exec-live-candidate`, and `npm test`
  passed.  The collector test used an injected fake spawn only.
- `git diff --check 7204c70^ 7204c70` passed.  The reviewed alpha diff has no
  v7 or OpenAI-named path changes; it adds a separate v8 registry, receipt
  fixture/intake, config, collector and fake-spawn test.

## Required repair boundary

Repair only the separate v8 preparation path and add negative tests for each
falsifier above: scorer mutation, missing/duplicate P0/P1, every config field,
binary/environment command substitution, raw JSONL/final-output tampering and
extra schema fields.  Do not invoke `codex exec`, read or manipulate
credentials, alter v7/OpenAI artifacts, aggregate a receipt, or claim a
result.  A fresh beta review is required for any future live artifact.
