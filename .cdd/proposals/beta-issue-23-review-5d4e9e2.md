# Beta review: issue #23 target `5d4e9e2493378408e77ce1456964f3f51814b87c`

Verdict: **REQUEST CHANGES**.

Reviewed target: `5d4e9e2493378408e77ce1456964f3f51814b87c`
(`alpha <alpha@prologos.cdd.cnos>`, `feat: add isolated cognitive Prolog
slice for #23`).  The checkout was clean at that commit before this review.
This review is against GitHub #23,
`.cdd/designs/prolog-cognitive-memory-v1.md`, and
`.cdd/unreleased/23/gamma-scaffold.md`.

## What reproduced

`npm run test:cognitive-memory` passed.  It demonstrated a fresh SWI-Prolog
child, a two-rule multi-hop result (`r2` then `r1`) with snapshot IDs/sources,
a candidate that remains `candidate` until `admitCandidate` receives an
explicit decision, an `unknown` missing-goal result, and the revision/direct
temporal-polarity fixture.  `npm test` also passed (all existing regression
commands exited 0).  `git diff --check
6dc3d412188c8f29ed3e17031ef6335eb27118d6
5d4e9e2493378408e77ce1456964f3f51814b87c` passed.

An independent full-Prolog resource probe with `loop :- loop.` returned
`{"status":"error","error":"time_limit_exceeded"}` in about 1041 ms
with `timeoutMs: 1100`; the candidate is indeed executed in the child SWI
process, not loaded by Node.  Source inspection confirms that Node only writes
the candidate into the temporary run directory and invokes
`sandbox-exec ... swipl`; `consult(Candidate)` is in `cognitive-runner.pl`.

## Blocking finding: the runtime is a fresh child process, not capability-empty

The profile in `cognitive-memory.js` is:

```text
(allow default) (deny network*)
(deny file-write* (subpath "/Users") (subpath "/Volumes") (subpath "/Library"))
(allow file-write* (subpath <temporary-run-directory>))
```

This is a real macOS sandbox mechanism, but its policy permits host reads and
host writes outside those three path prefixes.  It therefore does not meet the
binding design/scaffold requirements of “no host-file authority” and “no
durable database authority”, and cannot truthfully be called
“capability-empty”.

Reproduction from this target (the empty snapshot is intentionally avoided
because the runner currently expects at least one `pam_item/3`):

```sh
node <<'NODE'
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createSnapshot, createCandidate, runThought } = require('./cognitive-memory');
(async () => {
  const snapshot = createSnapshot({ id: 'beta-snapshot', items: [
    { id: 'base', program: 'base_fact.', source: 'beta', status: 'accepted' }
  ] });
  const target = path.join(os.tmpdir(), `pam-beta-host-write-${process.pid}`);
  for (const [id, program, goal] of [
    ['read', "host_read :- open('/etc/hosts', read, S), get_char(S, C), close(S), nonvar(C).", 'host_read'],
    ['write', `host_write :- open('${target}', write, S), write(S, beta), close(S).`, 'host_write'],
    ['net', ":- use_module(library(socket)).\\nnetwork_probe :- tcp_socket(S), tcp_connect(S, ip(1,1,1,1):80), close(S).", 'network_probe']
  ]) {
    const candidate = createCandidate({ id, source: 'beta', program });
    const result = await runThought({ snapshot, candidate, goal, timeoutMs: 1200 });
    console.log(id, JSON.stringify(result.runEvidence.result));
  }
  console.log('write_exists', fs.existsSync(target));
  if (fs.existsSync(target)) fs.unlinkSync(target);
})();
NODE
```

Observed results:

```text
read {"bindings":"[]","proof":{"goal":"host_read","kind":"trace_unavailable"},"status":"proved"}
write {"bindings":"[]","proof":{"goal":"host_write","kind":"trace_unavailable"},"status":"proved"}
net {"error":"error(socket_error(eperm,'Operation not permitted'),_...)","status":"error"}
write_exists true
```

Thus network denial reproduced, but it does not cure the successful host read
and durable `/tmp` write.  The focused test's denial of a write under
`/Users/artem` is only a prefix-specific check and is insufficient evidence
for the claimed authority boundary.  The alpha self-coherence report itself
also states that denial of every host filesystem read is not proven; that debt
is an unmet AC, not approvable deferred debt.

## Required repair

1. Replace the permissive `allow default` profile with a reproducible isolation
   boundary that grants only the runtime's required binaries/libraries and
   declared read-only inputs plus the disposable output path.  A container/VM
   is acceptable if it is the actual execution boundary; merely creating a
   temporary directory is not.
2. Add focused probes that prove denial of a host read, a write outside the
   disposable run/output path (including `/tmp`), and network access, while
   retaining a full-Prolog construct test.  Test actual execution, not just
   profile text.
3. Do not describe the current implementation as capability-empty or as
   having no host/durable-memory authority until those probes pass.  Preserve
   the demonstrated fresh-child/non-Node-consult boundary, but label it
   accurately.

No provider call, live artifact, CDR receipt, or unauthorized production
surface was added by the reviewed diff.  The target remains unsuitable for GO
solely because the central isolation AC is false as implemented.
