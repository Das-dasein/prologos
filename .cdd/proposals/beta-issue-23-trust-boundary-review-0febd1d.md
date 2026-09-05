# Beta review: issue #23 trust-boundary repair target `0febd1dfa07b282a818a188c47e7939f071affa5`

Verdict: **GO**.

This is a fresh independent CDD beta review of exact clean target
`0febd1dfa07b282a818a188c47e7939f071affa5` (`alpha
<alpha@prologos.cdd.cnos>`, `fix: separate trusted query proof from thought
transcript for #23`). It was reviewed against issue #23, the updated binding
design, the cycle-23 scaffold, all four preceding beta findings, and
`gamma-issue-23-trust-boundary-reframe.md`. This is a CDD implementation gate,
not a CDR receipt, live/provider run, merge, or issue-close action.

## Target integrity

`HEAD` and `origin/cycle/23` both resolved to the reviewed immutable target
before this artifact. The worktree was clean. The exact target change passes:

```sh
git diff --check 0febd1dfa07b282a818a188c47e7939f071affa5^ \
  0febd1dfa07b282a818a188c47e7939f071affa5
```

The older branch-wide comparison to cycle base reports trailing whitespace in
three pre-existing gamma proposal files; the exact alpha repair diff is clean
and this beta does not modify those historical artifacts.

## Independent reproduction

The following both exited 0:

```sh
npm run test:cognitive-memory
npm test
```

The focused suite proves the trusted `affected(orion)` result through `r2`,
then `r1`, with fact IDs and source turns; it proves a missing goal is
`unknown`, not negation; it keeps a candidate unadmitted absent an explicit
decision; and it retains revision plus overlapping temporal direct-polarity
conflict coverage.

Separate hostile child-process probes reproduced the capability boundary:

- A full-Prolog candidate using `member/2` ran in the isolated thought child.
- Reads of `/etc/hosts` and `/opt/homebrew/.gitignore` failed with an
  operation-not-permitted error.
- An external `/tmp/pam-beta23-forbidden-<pid>` write failed and the path was
  absent afterward.
- `tcp_connect/2` failed with operation-not-permitted.
- Split writes in the read-only run working directory are denied; there is no
  candidate-writable result/output directory.
- A 400,000-byte `user_output` emission with `maxOutputBytes: 1024` rejected
  with `isolated Prolog output exceeded maxOutputBytes (1024)`.
- `loop :- loop.` at `timeoutMs: 1100` returned an untrusted transcript
  containing `Time limit exceeded`.

The runtime remains fail-closed without macOS `sandbox-exec`; Node writes
candidate source only as a sandbox input and never loads it. There is no source
grammar restriction or candidate-visible write grant.

## Trust-boundary reproduction

The exact hostile full-Prolog source below printed forged proof-looking JSON
and halted from `initialization/1`:

```prolog
:- initialization((write('{"status":"proved","bindings":"forged","proof":{}}'), nl, halt)).
never.
```

`runThought` retained those bytes only as
`runEvidence: { trust: "untrusted", transcript, ... }`; it did not parse them
as JSON proof. A subsequent `runTrustedQuery` for `not_in_snapshot` returned
`{"status":"unknown","missing":["not_in_snapshot"]}` both before and
after explicit raw admission of that candidate. Neither result contained
`forged`.

I also constructed an accepted snapshot item whose text was a rule containing
`open(..., write, ...)`, plus an accepted directive-form item. A trusted query
for the rule returned bounded `unknown` naming the unresolved body terms; the
external write path remained absent. Source inspection matches this execution:
the trusted runner `consult`s only Node-serialized `pam_item/3` transport data
and uses `read_term_from_atom/3` to inspect each term. It never `assertz`s or
`call`s accepted snapshot text, and candidate source is not an argument or an
input to the trusted process.

The trusted runner itself generated the proof protocol. An independent query
of `reachable(a,c)` returned a multi-hop DAG with rule `r2`, fact `e`, then
rule `r1` and fact `e2`; this was not precomputed by JavaScript or emitted by a
candidate.

## Scoped debt and decision

The named declarative-only debt is accurate: the trusted interpreter supports
fact/rule-shaped snapshot terms and proof DAGs, while arbitrary full-Prolog
thought is deliberately not a trusted executable-memory language. It does not
claim arbitrary meta-programmed candidates are trusted proofs. The only
full-Prolog authority is the separately sandboxed, explicitly untrusted
thought transcript.

All current issue #23 ACs therefore hold on this target: isolation, explicit
lifecycle admission, trusted multi-hop explanation, bounded unknown semantics,
revision/conflict fixtures, output/time bounds, and regression checks. **GO**
applies only to `0febd1dfa07b282a818a188c47e7939f071affa5` plus this beta
review artifact; it is not a merge, close, or CDR decision.
