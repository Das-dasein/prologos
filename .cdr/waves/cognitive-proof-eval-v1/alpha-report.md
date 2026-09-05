# Alpha report: cognitive-proof-eval-v1

Role: fresh CDR alpha for issue #26. Target source commit:
`82bcc82fca8d8ebb2734e1006b754a6d4e31b4ac`.

Produced only prospective offline matter: method, synthetic sanitized fixture,
manifest, deterministic `runTrustedQuery` oracle and status. The fixture has
12 cases, with two each of multi-hop, unknown, revision, temporal direct
conflict, provenance disambiguation, and plausible untrusted thought.

The oracle hashes `dataset.json`, hashes all 12 stored expected trusted
results, replays each against its accepted snapshot, checks active revisions
and conflict records, and executes a deliberately forged full-Prolog candidate
on the two thought cases before rerunning the trusted query. Its transcript is
labelled untrusted and cannot alter the rerun result. No candidate is admitted.

Commands run from the source target:

```text
node .cdr/waves/cognitive-proof-eval-v1/validate-trusted-proof-eval-v1.js
npm run test:cognitive-memory
npm test
git diff --check
```

The fixture hash is
`dd0ed11f7547940f7ce33e3b1118b27aa41bfcd786040706b2b9fc37f9729a75`.
The deterministic command returned `offline-symbolic-ok`, 12 cases, and 12
expected-result SHA-256 values; the focused core and full regression returned
success; `git diff --check` returned success.

No provider/model/API was called; there is no raw live output, answer score,
threshold result, CDR receipt, or effectiveness claim. P0/P1 retain exact
snapshot/query/model/prompt/sampling/budget invariants, P1 adds only trusted
proof context, and PX is labelled exploratory.

Limitations/debt: the later CDS harness must implement prompt construction,
per-request measured-equality sentinel for `E`, oracle-leak sentinel, raw
usage retention and answer/provenance scorer. Fresh independent CDR beta must
recompute this fixture before any live conclusion.

## Issue #29 alpha repair: prospective equal-budget slot contract

Role: fresh CDR alpha on `cdr/29`, starting from gamma target
`5d4dff6e98e062ee5d9781b547a80d8687c2b517`. This repair changes no historical
result, receipt, threshold, or live artifact.

The dataset now pre-registers one evidence slot for every one of its 12 cases.
The repaired dataset SHA-256 is
`63d68d4decad2dcdadbfc1204c58cec2650a46a90442cb63889e3d7989e07e51`.
`validate-equal-budget-slots-v1.js` assembles P0 with only `~` control bytes
and P1 with the trusted proof/missing result plus deterministic `~` padding.
It uses `offline-utf8-byte-v1`, explicitly an offline byte-accounting
abstraction and not a model/provider tokenizer claim. It requires P0/P1 to be
identical outside the slot and equal under that abstraction. An overlong proof
makes its case `unavailable`; it is never truncated. The companion test proves
rejection for an overlong result, outside-slot mutation, unequal slot, and
oracle/control leakage.

Commands for this repair:

```text
node .cdr/waves/cognitive-proof-eval-v1/validate-trusted-proof-eval-v1.js
node .cdr/waves/cognitive-proof-eval-v1/validate-equal-budget-slots-v1.js
node test-trusted-proof-equal-budget-v1.js
npm run test:cognitive-memory
npm test
git diff --check
```

Results: the symbolic oracle returned `offline-symbolic-ok` for 12 cases; the
slot validator returned `offline-equal-budget-slot-ok` for the same 12 cases;
the focused negative test reported all four required rejection classes; the
cognitive-memory focused regression and `npm test` passed; `git diff --check`
passed. The final immutable α commit is recorded by Git after this report is
committed.

No provider/model/API was called. There is no raw live output, provider token
measurement, CDR receipt, PAM claim, or effectiveness conclusion. Debt for a
future CDS implementation remains: use the pinned provider/model tokenizer or
provider-reported usage to measure `E` request-by-request, record the full
equality digest, retain reviewed raw artifacts, and enforce the live leakage
sentinel before any call. Fresh independent CDR beta must reproduce this
offline contract before CDS #28 can proceed.

## Issue #29 R2: immutable slot-registration binding

This α repair adds `slot-registration-v1.json`, a canonical
`trusted-proof-evidence-slots-v1` object with every fixture's
`case_id -> slot_bytes` mapping. Its SHA-256 is
`4d05d2176f4e629370771925543d4670259e15b633c5ef3be47803c6c9bf9a46`.
The deterministic validator derives the same map from the dataset and fails
unless it equals the registration self-hash and both method/manifest bindings;
its JSON result emits that hash.

The focused test rejects a one-byte post-hoc slot change with a stale binding,
a matching dataset-and-assembled-pair rewrite, a registration rehashed after
the manifest binding, and missing or extra dataset mappings. This remains an
offline byte-accounting repair, not a provider/model token result, live
artifact, CDR receipt, effectiveness conclusion, or CDS #28 implementation.
Fresh β remains owed.

## Issue #32 — alpha local receipt-intake preparation

Source start: `e5edd9c40d57ef4f46e9dcc2ef106ca1d1cd53ee`.

Added `receipt-intake-v1.schema.json`, its explicitly synthetic
`synthetic_non_result` envelope, deterministic stdlib-only validator, and
local-intake specification. The validator binds the trusted v1 source/dataset/
slot files and per-record snapshot/query/slot/proof/raw/usage/scorer fields.
It does not import a provider SDK, access network, sandbox-exec, invoke a
model, read a committed raw output, score answers, or produce a result.

Exact validation commands:

```sh
npm run test:cdr-receipt-intake
node .cdr/waves/cognitive-proof-eval-v1/validate-receipt-intake-v1.js
npm test
```

The focused self-test accepts only the synthetic non-result envelope and
deterministically rejects missing P0/P1, duplicate record, wrong source
binding, unequal `E`, oracle leakage, in-place overwrite, and a mismatching
local raw SHA. The default fixture is not a provider result and is not
aggregable. `prolog-memory-eval-v0` was not modified and remains `REVISE`.
This is preparation only; no effectiveness conclusion or CDR receipt exists.

## Issue #32 R1 — canonical P1 proof-digest binding repair

Starting from gamma repair target
`a94c87ffd749e9fc85b3f8ec649b4e8ed19eaf52`, this alpha repair adds the
versioned immutable `trusted-proof-digest-registry-v1.json`. Its canonical
payload records the pinned source commit, dataset path/hash, and every
`case_id -> SHA-256(canonical runTrustedQuery result)` binding; its self-hash
is `a68d6a010b7225f42bedb447a209e50617cd26bf2a9a6ab40aa0d40b61ae42e4`.
The trusted symbolic validator recomputes every digest from the pinned query
result and rejects a changed/missing/extra registry mapping or binding.

The receipt envelope and schema now bind this registry. The stdlib-only intake
requires P0 proof `null` and requires every P1 proof digest to exactly equal
the registered digest for its `case_id`; its synthetic non-result fixture is
derived from that registry. Its focused self-test includes a rejection for a
valid-format but wrong P1 digest (`"f".repeat(64)`).

No provider, network, model, SDK, scorer, raw live output, aggregation,
receipt, historical v0 change, or effectiveness claim was added. The repair
remains local preparation pending fresh independent CDR beta.
