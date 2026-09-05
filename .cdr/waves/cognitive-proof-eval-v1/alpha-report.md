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
