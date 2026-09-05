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
