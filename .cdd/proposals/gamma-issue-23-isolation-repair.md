# Gamma repair: issue #23 capability boundary

Date: 2026-09-06 (Europe/Samara)  
Role: gamma  
Input: beta review `fd0ab302e06da3dd307ac0a30cd5e3ec6e53b3b4` of alpha target
`5d4e9e2493378408e77ce1456964f3f51814b87c`  
State: repair dispatch, not a CDR result.

## Finding accepted

Beta reproduced that the current `sandbox-exec` profile uses `allow default`.
The candidate can read `/etc/hosts` and write a durable `/tmp` path, although
network access is denied. A fresh child process is therefore not a
capability-empty full-Prolog runtime. The binding AC is unmet; it is not
admissible as deferred debt.

## Repair scope

Replace the permissive profile with an actual default-deny execution boundary.
The boundary may be a reproducibly available macOS sandbox profile or a
container/VM only when it is the runtime actually used by the test. It must
grant exactly the interpreter/runtime resources, declared read-only snapshot
and candidate inputs, plus one disposable output/run location. It must not
silently fall back to the current permissive child process when that boundary
is unavailable.

No restriction is imposed on the Prolog language inside the isolated runtime.
`use_module`, recursion, meta-programming and other full-Prolog mechanisms
remain language-level possibilities; authority is controlled by the OS/runtime
boundary rather than a source allowlist.

## Repair acceptance oracle

The focused suite must execute—not merely inspect policy text—and demonstrate:

| Probe | Expected result |
|---|---|
| full-Prolog candidate construct | runs in the isolated child |
| declared snapshot/candidate inputs | readable by the child |
| host read, e.g. `/etc/hosts` | denied |
| external/durable write, including a `/tmp` path outside the disposable run location | denied and path absent |
| network connection | denied |
| candidate lifecycle | candidate remains non-admitted absent explicit admission |
| existing logical boundary | multi-hop proof, bounded unknown, revision and temporal conflict remain covered |

The repair report must name the platform boundary, tested commands/results and
any unsupported platform behavior. If a secure boundary cannot be made
reproducible on the current platform, the feature must fail closed and be
reported as unavailable; it cannot masquerade as isolated execution.

## Constraints retained

- no provider call, live/partial raw artifact, CDR receipt or quality claim;
- no automatic candidate admission;
- no source grammar/AST allowlist as a substitute for sandboxing;
- no merge/issue closure by alpha;
- fresh alpha writes only alpha-owned implementation/self-coherence evidence;
- fresh beta must rerun the concrete probes against the immutable repair head.

## Fresh alpha dispatch

```text
Role: fresh CDD alpha repair for issue #23 on cycle/23.

Read the binding design, gamma scaffold, beta review
.cdd/proposals/beta-issue-23-review-5d4e9e2.md and this gamma repair artifact.
Repair only the failed capability-boundary AC. Do not restore a restricted
Prolog grammar or permit a permissive fallback. Demonstrate the actual runtime
denies host read, external /tmp write and network, while a full-Prolog
candidate still runs. Preserve the existing lifecycle and proof fixtures.

Use alpha identity, update canonical self-coherence, run focused/full tests and
diff check, commit/push an immutable repair head. Do not author beta/gamma
verdicts, merge or emit a CDR receipt.
```
