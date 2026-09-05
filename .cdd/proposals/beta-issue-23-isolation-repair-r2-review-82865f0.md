# Beta review: issue #23 repair R2 target `82865f0952cac23941667209de66e516cc2afaae`

Verdict: **REQUEST CHANGES**.

Reviewed the clean, exact `cycle/23` target
`82865f0952cac23941667209de66e516cc2afaae` (`alpha <alpha@prologos.cdd.cnos>`,
`fix: minimize Prolog runtime isolation for #23`) against GitHub #23, the
binding `.cdd/designs/prolog-cognitive-memory-v1.md`,
`.cdd/unreleased/23/gamma-scaffold.md`, both preceding beta reviews, and
`.cdd/proposals/gamma-issue-23-isolation-repair-r2.md`. This is an independent
CDD beta review, not a CDR receipt.

## Reproduced passing evidence

The target checkout was clean before the review. The following commands exit
0:

```sh
git diff --check 82865f0952cac23941667209de66e516cc2afaae^ 82865f0952cac23941667209de66e516cc2afaae
npm run test:cognitive-memory
npm test
```

The focused suite and a separate `node` hostile-probe script reproduce all of
these facts:

- an unrestricted candidate using `member/2` executes in the fresh SWI child;
- `affected(orion)` is derived by SWI through `r2`, then `r1`, with rule IDs,
  fact IDs, and source turns in its proof;
- an absent predicate is `unknown`, never negation;
- candidate run evidence retains `status: "candidate"`, and
  `admitCandidate(..., {admit: false, ...})` throws;
- direct overlapping opposite polarities yield both source IDs; a replacement
  removes the replaced assertion from active state and removes that conflict;
- recursive `r :- r.` returns `time_limit_exceeded` at `timeoutMs: 1100`;
- candidate reads of `/etc/hosts` and `/opt/homebrew/.gitignore` fail with
  `permission_error(open,source_sink,...)`;
- an external `/tmp/beta-r2-ext-<pid>` write fails and the path is absent; and
- `tcp_connect/2` fails with `socket_error(eperm,...)`.

Source inspection also confirms Node does not parse or consult candidate
source: it writes `candidate.pl` and launches `sandbox-exec`; the only
`consult(Candidate)` is in `cognitive-runner.pl`, loaded by the isolated SWI
process. The profile is default-deny and no longer grants `/opt/homebrew` as a
root. It grants the specific SWI Cellar runtime, directly loaded dylib
directories, system runtime locations, inputs, and the run output directory.
This preserves the required full-Prolog language rather than substituting a
grammar or allowlist.

## Blocking finding: `maxOutputBytes` is a per-file ceiling, not the declared run-output quota

The R2 repair replaces the former post-buffer-only behavior with
`/bin/sh ulimit -f`. On macOS this sets inherited `RLIMIT_FSIZE` in 512-byte
blocks. That is an in-run kernel file-size limit, so the focused single-file
400,000-byte probe correctly fails under `maxOutputBytes: 1024`.

But `RLIMIT_FSIZE` limits the size of **each regular file**; it does not limit
the aggregate bytes written by a process across several files. The candidate
has write access to the disposable `outputDir` and can therefore write more
than the declared `maxOutputBytes` during one run by splitting output. This
contradicts the R2 repair requirement to enforce `maxOutputBytes` over
candidate-visible data during execution, and leaves the API's stated
`maxOutputBytes` claim false.

Reproduction on the reviewed immutable target:

```sh
node <<'NODE'
const { createSnapshot, createCandidate, runThought } = require('./cognitive-memory');
(async () => {
  const snapshot = createSnapshot({ id: 'beta-quota', items: [
    { id: 'base', program: 'base_fact.', source: 'beta', status: 'accepted' }
  ] });
  const candidate = createCandidate({
    id: 'split-output', source: 'beta',
    program: "r :- forall(between(1,3,N),(atom_concat('part-',N,F),open(F,write,S),forall(between(1,900,_),put_byte(S,120)),close(S)))."
  });
  const thought = await runThought({
    snapshot, candidate, goal: 'r', timeoutMs: 1500, maxOutputBytes: 1024
  });
  console.log(JSON.stringify(thought.runEvidence.result));
})();
NODE
```

Observed result:

```json
{"bindings":"[]","proof":{"goal":"r","kind":"trace_unavailable"},"status":"proved"}
```

The candidate writes 2,700 bytes during execution, over 1,024 bytes, yet
proves successfully. Cleanup after the run does not cure this: it is neither
an aggregate resource bound nor a failure at the declared quota. The rounding
in `Math.ceil(maxOutputBytes / 512)` is an additional exactness limitation;
the self-coherence debt records it, but a named debt cannot replace an AC.

## Required repair

Enforce a cumulative candidate-visible output quota for a run (files and any
other candidate-visible output), at execution time, and add a hostile split
output test such as the reproduction above. A per-file `RLIMIT_FSIZE` may
remain a useful secondary guard, but alone is insufficient. Keep the existing
default-deny runtime closure, full-Prolog execution, fail-closed platform
behavior, and prior passing isolation/lifecycle/proof/timeout coverage.

No provider or live run was invoked, no CDR receipt was issued, and no merge,
issue closure, or product-code change is authorized by this review. GO is not
available until the cumulative output-quota AC is independently reproduced.
