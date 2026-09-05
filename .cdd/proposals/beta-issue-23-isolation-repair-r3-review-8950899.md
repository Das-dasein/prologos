# Beta review: issue #23 repair R3 target `8950899570c6f7d8af2681a0a020d9dd03251d12`

Verdict: **REQUEST CHANGES**.

This is a fresh independent CDD beta review of the clean exact `cycle/23`
target `8950899570c6f7d8af2681a0a020d9dd03251d12` (`alpha
<alpha@prologos.cdd.cnos>`, `fix: remove thought candidate write authority for
#23`) against GitHub #23, `.cdd/designs/prolog-cognitive-memory-v1.md`,
`.cdd/unreleased/23/gamma-scaffold.md`, all preceding beta findings, and
`.cdd/proposals/gamma-issue-23-isolation-repair-r3.md`. No provider, live
archive, CDR receipt, merge, or issue-close action was taken.

## Reproduced passing evidence

The checkout was clean before the review. These commands exit 0:

```sh
git diff --check 8950899570c6f7d8af2681a0a020d9dd03251d12^ 8950899570c6f7d8af2681a0a020d9dd03251d12
npm run test:cognitive-memory
npm test
```

Independent hostile execution confirms that the full-Prolog `member/2`
candidate runs in the fresh child; `affected(orion)` is derived in SWI through
`r2`, then `r1`, with item IDs and source turns in its proof; an absent goal
is `unknown`; and `loop :- loop.` yields `time_limit_exceeded` at
`timeoutMs: 1100`. Candidate evidence remains `candidate`, and the focused
suite retains explicit-only admission plus revision and direct temporal
polarity-conflict coverage.

The macOS default-deny boundary actually rejects candidate reads of
`/etc/hosts` and `/opt/homebrew/.gitignore`, a write to an external `/tmp`
path, `tcp_connect/2`, and split-file writes in the run working directory.
The external path was absent after execution. A candidate writing 400,000
bytes to `user_output` rejects with `isolated Prolog output exceeded
maxOutputBytes (1024)`. This is a single aggregate count over child stdout and
stderr pipes, not the previous per-file quota claim. Source inspection also
confirms Node does not parse or consult candidate text: its sole candidate
load is `consult(Candidate)` in `cognitive-runner.pl` in the sandboxed SWI
child. There is no candidate-writable output/result file.

## Blocking finding: candidate and trusted runner share an unauthenticated result channel

R3 calls runner stdout the sole trusted JSON result protocol, but it exposes
that same `current_output` pipe to unrestricted candidate code. Full Prolog
allows a consulted file to execute an `initialization/1` directive. The
candidate can write an arbitrary JSON object and `halt/0` before `main/0`
finishes. Node observes exit 0 and blindly `JSON.parse`s the candidate's bytes
as if they were runner output.

Reproduction on this immutable target:

```sh
node <<'NODE'
const { createSnapshot, createCandidate, runThought } = require('./cognitive-memory');
(async () => {
  const snapshot = createSnapshot({ id: 'beta-protocol', items: [
    { id: 'base', program: 'base_fact.', source: 'beta', status: 'accepted' }
  ] });
  const candidate = createCandidate({
    id: 'forged-result', source: 'beta',
    program: ":- initialization((write('{\\\"status\\\":\\\"proved\\\",\\\"bindings\\\":\\\"forged\\\",\\\"proof\\\":{}}'), nl, halt)).\\nnever."
  });
  const thought = await runThought({ snapshot, candidate, goal: 'never' });
  console.log(JSON.stringify(thought.runEvidence.result));
})();
NODE
```

Observed result:

```json
{"status":"proved","bindings":"forged","proof":{}}
```

`never` is not proved and the JSON has no runner-created proof semantics, yet
the host reports it as run evidence. This is not a source-language policy
issue: forbidding directives, `write/1`, or `halt/0` would be the prohibited
grammar/allowlist substitute and would contradict the full-Prolog exploratory
scope. It is a missing capability/protocol boundary. The current aggregate
byte counter only bounds this forged message; it does not authenticate its
origin or assure that exactly the trusted runner produced one result.

## Required repair

Make the result channel genuinely runner-owned and validate completion from a
trusted boundary while retaining unrestricted full-Prolog candidate source.
Candidate-visible standard output must not be accepted as runner evidence;
the design needs a separate trusted IPC/file-descriptor/process protocol whose
origin and single-result semantics cannot be forged or terminated by candidate
code. Preserve the R3 default-deny runtime closure, no-write capability
profile, aggregate pipe ceiling, and the passing isolation/logical/lifecycle
tests. Add the exact initialization/forged-result hostile test.

GO is unavailable until a fresh beta can reproduce trustworthy result origin,
not merely valid JSON and a zero exit status.
