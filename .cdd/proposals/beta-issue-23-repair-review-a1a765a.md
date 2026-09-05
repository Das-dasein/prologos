# Beta review: issue #23 repair target `a1a765aba5d00380797634bf0e5b650ed6444a11`

Verdict: **REQUEST CHANGES**.

Reviewed the clean, exact `cycle/23` target
`a1a765aba5d00380797634bf0e5b650ed6444a11` (`alpha <alpha@prologos.cdd.cnos>`,
`fix: enforce default-deny thought sandbox for #23`) against GitHub #23, the
binding `.cdd/designs/prolog-cognitive-memory-v1.md`,
`.cdd/unreleased/23/gamma-scaffold.md`, the preceding beta finding, and
`.cdd/proposals/gamma-issue-23-isolation-repair.md`. This is a repair review,
not a CDR result.

## Passing reproduction

On macOS with SWI-Prolog 10.0.2 and `/usr/bin/sandbox-exec`, both
`npm run test:cognitive-memory` and `npm test` exit 0. `git diff --check
a1a765aba5d00380797634bf0e5b650ed6444a11^ a1a765aba5d00380797634bf0e5b650ed6444a11`
also exits 0.

The focused suite and independent child-process probes reproduce these working
boundaries:

- a full-Prolog `member/2` candidate proves in the isolated SWI child;
- `/etc/hosts` read is denied (`permission_error(open,source_sink,...)`);
- an external `/tmp/beta-out-<pid>` write is denied and the path remains
  absent;
- `tcp_connect/2` is denied with `socket_error(eperm,...)`;
- a candidate stays `candidate` until `admitCandidate` receives
  `{admit: true, ...}`;
- a two-rule multi-hop conclusion is produced by SWI with proof nodes for
  rules `r2`, `r1` and facts `e`, `seed`; an absent goal is `unknown`, not
  negation; revision removes the replaced active assertion; only overlapping
  opposite polarities conflict;
- `loop :- loop.` with `timeoutMs: 1100` returns
  `{"status":"error","error":"time_limit_exceeded"}` in about 1112 ms.

Node does not `consult` candidate text. It writes candidate input and launches
`sandbox-exec`; `consult(Candidate)` is confined to `cognitive-runner.pl` in
the child.

## Blocking finding 1: broad host filesystem authority remains

The apparent default-deny profile reintroduces broad host read authority:
`runtimeReadRoots()` computes

```text
base = /opt/homebrew/Cellar/swi-prolog/10.0.2/lib/swipl
homebrewPrefix = path.resolve(base, "../../../../..") = /opt/homebrew
```

and passes `(subpath "/opt/homebrew")` to `allow file-read*`
(`cognitive-memory.js:71-72,89`). That is the whole Homebrew installation,
not a declared snapshot/candidate input or a minimal enumerated interpreter
runtime closure. It gives candidate code read access to unrelated host tools,
packages, caches, configuration, and any other host file under that prefix.
It contradicts the design's required **no host-file authority** and the gamma
repair oracle's grant of *exactly* interpreter/runtime resources and declared
inputs.

Reproduction on the reviewed target:

```sh
node <<'NODE'
const { createSnapshot, createCandidate, runThought } = require('./cognitive-memory');
(async () => {
  const snapshot = createSnapshot({ id: 's', items: [
    { id: 'a', program: 'a.', source: 'beta', status: 'accepted' }
  ] });
  const candidate = createCandidate({
    id: 'homebrew-read', source: 'beta',
    program: "r :- open('/opt/homebrew/bin/swipl', read, S), get_byte(S, _), close(S)."
  });
  console.log(JSON.stringify((await runThought({ snapshot, candidate, goal: 'r' })).runEvidence.result));
})();
NODE
```

Observed:

```json
{"bindings":"[]","proof":{"goal":"r","kind":"trace_unavailable"},"status":"proved"}
```

This is actual candidate execution, not a source-policy inspection. Passing
the `/etc/hosts` probe does not establish capability-empty filesystem access
when another broad host root is readable.

## Blocking finding 2: `maxOutputBytes` does not bound candidate output

The repair claims an output-byte limit, but `maxOutputBytes` is supplied only
as Node `execFile`'s stdout/stderr `maxBuffer` (`cognitive-memory.js:93-99`).
Candidate code has unrestricted write access to `outputDir`, and its file
output is not measured. It can exceed the supplied output ceiling while the
run reports success, so the explicit output/resource bound is not met.

Reproduction (400,000 bytes against a 1,024-byte declared limit):

```sh
node <<'NODE'
const { createSnapshot, createCandidate, runThought } = require('./cognitive-memory');
(async () => {
  const snapshot = createSnapshot({ id: 's', items: [
    { id: 'a', program: 'a.', source: 'beta', status: 'accepted' }
  ] });
  const candidate = createCandidate({ id: 'big', source: 'beta', program:
    "r :- open('unbounded-output', write, S), forall(between(1, 400000, _), put_byte(S, 120)), close(S)." });
  console.log(JSON.stringify((await runThought({
    snapshot, candidate, goal: 'r', timeoutMs: 1500, maxOutputBytes: 1024
  })).runEvidence.result));
})();
NODE
```

Observed:

```json
{"bindings":"[]","proof":{"goal":"r","kind":"trace_unavailable"},"status":"proved"}
```

The temporary directory is later removed, but that does not impose a bound
during execution and therefore does not satisfy the stated output/resource
limit.

## Required repair

1. Replace the broad `/opt/homebrew` grant with a reproducibly minimal,
   read-only runtime closure (and prove that unrelated host paths in the
   runtime prefix cannot be read), while preserving full Prolog and no
   source-language grammar/allowlist substitute.
2. Enforce `maxOutputBytes` on actual candidate-visible files/streams during
   the run, or use a runtime boundary that genuinely provides that quota; add
   an execution probe that exceeds it and fails.
3. Retain fail-closed behavior when the macOS boundary is unavailable and
   rerun all existing isolation, lifecycle, proof, unknown, revision,
   conflict, timeout, focused, and project regression checks on the immutable
   repair head.

No merge, issue closure, provider invocation, live artifact, CDR receipt, or
PAM-C1 claim is authorized by this review. GO is not available while either
host filesystem authority or the promised output limit remains false.
