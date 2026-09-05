# Gamma repair R3: eliminate candidate file-output authority

Date: 2026-09-06 (Europe/Samara)  
Role: gamma  
Input: beta review `50dc9341188c401bc542fab81c38d1bce960fd84` of alpha target
`82865f0952cac23941667209de66e516cc2afaae`.

## Accepted finding

`RLIMIT_FSIZE` is per file. It correctly rejects a single large file but a
full-Prolog candidate writes three 900-byte files under `maxOutputBytes: 1024`
and succeeds. Thus the API's claimed run-output bound is false. Do not replace
this with polling, cleanup, or a post-hoc measurement presented as prevention.

## Decision

For this first cognitive-runtime slice, the thought candidate receives **no
write-capability at all**. The only permitted result channel is the runner's
bounded stdout JSON protocol, owned by trusted runner code. The candidate may
use full Prolog as a language, but `open/3` for writing, `assertz/1` persistence
outside its process database, and all file output are denied by the runtime
boundary. Ephemeral dynamic predicates remain process-local and disappear when
the session exits.

This is not an artificial grammar restriction. It is an empirical capability
profile: reasoning is read-only against a frozen snapshot. A future cycle may
add an explicitly designed artifact channel with a real aggregate quota.

## Required repair

- Remove candidate access to a writable output directory and any file-result
  dependency. Runner emits its result to stdout only.
- Bound runner/candidate visible stdout/stderr as one process-level channel;
  an over-limit candidate output must fail rather than be silently accepted.
- Retain strict default-deny minimal runtime closure, full-Prolog execution,
  host-read/network/external-write denial, resource timeout and fail-closed
  platform behavior.
- Explicitly test that a split-file candidate cannot create any output files;
  test candidate stdout exceeding `maxOutputBytes` fails; preserve multi-hop,
  unknown, lifecycle, revision/conflict and timeout tests.

## Fresh alpha dispatch

```text
Role: fresh CDD alpha repair R3 for issue #23 on cycle/23.
Read binding design/scaffold, all preceding beta and gamma repair artifacts,
then implement only this no-candidate-write capability profile. Keep full
Prolog source language and do not source-filter it. Make runner stdout the
sole bounded result channel; eliminate file output authority, prove split-file
and oversized stdout failures, and preserve prior passing isolation/logical
evidence. Update alpha self-coherence, run focused/full/diff tests, commit/push
alpha-only work. No provider/live/CDR action, beta/gamma verdict, merge or
issue closure.
```
