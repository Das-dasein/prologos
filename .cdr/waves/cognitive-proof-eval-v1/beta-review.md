# Beta review: cognitive-proof-eval-v1

Role: fresh independent CDR beta. Reviewed immutable alpha target
`756ad31dc7dbbf28f1eab0e2f7f0dabe121c3b3c` (alpha source pin
`82bcc82fca8d8ebb2734e1006b754a6d4e31b4ac`) against `.cdr/POLICY.md`,
the v2 historical method/status, the cognitive-memory design, and the issue
#26 gamma scaffold.

## Verdict

**GO — offline method/dataset adequacy only.** This is not a PAM-C1 verdict,
CDR receipt, live-result approval, or usefulness conclusion. The historical
`prolog-memory-eval-v0` status remains `REVISE`.

## Independent clean reproduction

A detached clean worktree at the target was created. Before dependencies were
installed, the deterministic oracle and focused core test passed; `npm test`
then stopped solely because that new worktree did not yet contain the declared
`zod` dependency. After `npm ci` in the same clean worktree, all commands
passed:

```text
git diff --check 756ad31^ 756ad31
shasum -a 256 .cdr/waves/cognitive-proof-eval-v1/dataset.json
node .cdr/waves/cognitive-proof-eval-v1/validate-trusted-proof-eval-v1.js
npm run test:cognitive-memory
npm test
```

The recomputed dataset SHA-256 is
`dd0ed11f7547940f7ce33e3b1118b27aa41bfcd786040706b2b9fc37f9729a75`,
matching the manifest. The oracle returned `offline-symbolic-ok`: all 12
stored trusted results reproduced. Exact coverage was two cases each of
multi-hop, unknown, revision, temporal conflict, provenance, and untrusted
thought. Revision active IDs and direct-polarity conflict metadata also passed.

For both thought fixtures, beta separately supplied the fixture's untrusted
transcript as a candidate program to `runThought`; each result was marked
`untrusted`, and trusted reruns from the immutable accepted snapshot were
identical before and after. The checked-in validator additionally exercises a
deliberately forged full-Prolog candidate and verifies that its transcript
cannot change either trusted result.

## Boundary and calibration audit

- The target diff adds only offline wave documents, a synthetic/sanitized
  fixture, and its deterministic validator. It contains no `data/memory.pl`,
  live/provider/raw artifact, secret, receipt, hidden claim-status edit, or
  threshold modification.
- P0 is the normalized accepted snapshot plus query. P1 is P0 plus only the
  trusted proof DAG or bounded missing-goal result. PX adds a labelled
  untrusted transcript and is explicitly exploratory; it cannot select or
  support the primary comparison.
- The method explicitly defers to future CDS/live work: assembled-prompt
  construction and hashes, per-request measured equal `E`, raw answer and
  usage retention, answer/provenance scoring, and a pre-call oracle-leak
  sentinel. It prohibits `expected_result`, its hash, category, and hidden
  answer-contract fields from model prompts. Thus the symbolic oracle is not
  represented as an answer-quality measure.
- No provider/model call, observed/computed effectiveness result, CDR receipt,
  or claim that the system is useful appears in this wave. The declared
  limitation is aligned with policy: a future human-operated live run and a
  fresh independent beta remain necessary.

## Residual scope

This GO establishes only reproducible, bounded symbolic fixtures and an
adequate prospective comparative protocol. It does not make the future
equal-E, prompt-leakage, raw-retention, scoring, or live-answer gates
executable; absence or failure of any of those future gates must remain
`REVISE` or `INDETERMINATE`, never a positive PAM-C1 conclusion.

## Issue #29 fresh beta: equal-budget repair

Role: fresh independent CDR beta. Reviewed immutable alpha target
`b48a457be489fa95420224a85e0df36644e6d8d7` on `cdr/29` against
`.cdr/POLICY.md` and `gamma-equal-budget-repair.md`. The target's own delta is
clean (`git diff --check b48a457^ b48a457`); the pre-existing gamma document
has trailing whitespace when the whole branch is checked against `main`, which
is outside this alpha delta.

### Verdict

**REVISE — the method repair is not adequate and does not unblock CDS #28.**
The new code correctly establishes a useful *offline byte-equality* property
for a supplied P0/P1 pair; it does not fail closed on post-registration slot
changes. This is not a provider/model token claim, a CDR receipt, PAM claim,
threshold result, or effectiveness conclusion.

### Reproduction and coverage

From the clean target, beta recomputed dataset SHA-256
`63d68d4decad2dcdadbfc1204c58cec2650a46a90442cb63889e3d7989e07e51`,
matching `manifest.md`. The following all passed:

```text
node .cdr/waves/cognitive-proof-eval-v1/validate-trusted-proof-eval-v1.js
node .cdr/waves/cognitive-proof-eval-v1/validate-equal-budget-slots-v1.js
node test-trusted-proof-equal-budget-v1.js
npm run test:cognitive-memory
npm test
git diff --check b48a457^ b48a457
```

The symbolic oracle returned `offline-symbolic-ok` for all 12 cases, with two
cases each for multi-hop, unknown, revision, temporal conflict, provenance,
and untrusted-thought behavior. The equal-slot validator returned
`offline-equal-budget-slot-ok` for the same 12 cases. The checked-in negative
test rejects an overlong proof, mutation before the slot, an unequal P1 slot,
and a literal `hidden_answer_contract` control leak. P0 is all `~`; P1 holds
only the trusted result plus `~` padding; their material outside the slot is
identical under `offline-utf8-byte-v1`.

### Falsifier that failed

Beta additionally changed only `evidence_slots.multi_hop_01` from `1024` to
`1025` after registration, then reran `validateDataset`: it was **accepted**.
Beta also changed a fully assembled pair's declared slot and both padded slots
from 1024 to 1025 bytes: `validatePair` was **accepted**. Thus neither the
dataset validator nor the pair validator binds the declared slot map or its
dataset digest to an immutable pre-output commitment. A coherent post-hoc
increase can make an otherwise overlong proof fit while preserving the local
byte-equality calculation, directly violating gamma's no-post-output slot-size
choice constraint.

The control/oracle-leak attempt using the hidden answer text itself was
rejected by P0's all-tilde grammar. That result does not cure the independent
post-hoc-slot failure.

### Required repair and retained boundary

Before a method-only GO, the deterministic validator/test must pin and verify
the pre-registered slot map (or a committed canonical digest that covers it),
and reject every changed declared slot or assembled-pair slot size. The
negative test must exercise that exact mutation. A later CDS/live harness must
still use the pinned provider tokenizer or provider-reported per-request usage
to establish equal measured `E`, preserve its equality digest and reviewed raw
artifacts, and enforce a pre-call leakage sentinel. Those are future
harness/live gates, not evidence produced here.

No provider, live invocation, raw result, receipt, claim-status, PAM claim,
CDS #28 code, or threshold was added or altered by the alpha target or this
beta review.

## Issue #29 R2 fresh beta: immutable slot-registration binding

Role: fresh independent CDR beta. Reviewed the immutable alpha target
`59a3aedfa57185c1f41b395d5e610f371955e681` against `.cdr/POLICY.md`,
`method.md`, `manifest.md`, `status.md`, and both gamma repair records.

### Verdict

**GO — CDR method-repair adequacy only; CDS #28 is unblocked for its separate
CDS preflight/harness work.** This GO establishes neither provider-token
equality nor a live run, CDR receipt, PAM claim, threshold result, or
effectiveness conclusion. The historical `prolog-memory-eval-v0` remains
`REVISE`.

### Independent reproduction and binding audit

The exact R2 delta is whitespace-clean (`git diff --check 59a3aed^ 59a3aed`).
The broad branch comparison still reports trailing whitespace in the earlier
gamma markdown records; those lines predate this R2 alpha delta and are not a
slot-registration or method failure.

The symbolic validator returned `offline-symbolic-ok` for all 12 cases. The
equal-slot validator returned `offline-equal-budget-slot-ok` for the same 12.
The dataset SHA-256 recomputed to
`63d68d4decad2dcdadbfc1204c58cec2650a46a90442cb63889e3d7989e07e51`.
Coverage is exactly two cases each for multi-hop, unknown, revision, temporal
conflict, provenance, and untrusted thought. The canonical dataset map and
registration object both recomputed to
`4d05d2176f4e629370771925543d4670259e15b633c5ef3be47803c6c9bf9a46`;
the registration self-hash and the method/manifest bindings match it.

The following passed from the immutable target:

```text
node .cdr/waves/cognitive-proof-eval-v1/validate-trusted-proof-eval-v1.js
node .cdr/waves/cognitive-proof-eval-v1/validate-equal-budget-slots-v1.js
node test-trusted-proof-equal-budget-v1.js
npm run test:cognitive-memory
npm test
git diff --check 59a3aed^ 59a3aed
```

Beta independently attempted and observed rejection of: a one-byte dataset
slot change with stale registration; a matching dataset-and-assembled-pair
rewrite; a rehashed matching registration while method/manifest stayed stale;
a changed registration against the original dataset; missing and extra
mappings; an overlong proof; outside-slot mutation; unequal slot length; and
an oracle/control leak. The validator's `offline-utf8-byte-v1` remains
explicitly an offline byte-accounting abstraction, not a provider or model
tokenizer claim.

### Boundaries retained

The R2 alpha delta and this review contain no provider/live/raw artifact,
receipt, PAM claim, claim-status or threshold alteration, or CDS #28 code.
The future CDS work must still measure actual P0/P1 `E` per request with the
pinned provider/model mechanism, retain raw artifacts and equality digest, and
abort before calls on prompt leakage. A later fresh CDR beta remains required
for any live result or claim.
