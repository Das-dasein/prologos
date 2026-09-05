# Gamma repair R2: minimal runtime authority and output quota

Date: 2026-09-06 (Europe/Samara)  
Role: gamma  
Input: beta review `7fc28887e12d4167567a1423728627c3a6d5f543` of alpha repair
`a1a765aba5d00380797634bf0e5b650ed6444a11`.

## Accepted findings

The strict profile still grants `(subpath "/opt/homebrew")`; a candidate can
read `/opt/homebrew/bin/swipl`. This is broad host authority, not a minimal
runtime closure. `maxOutputBytes` limits Node stdout/stderr buffering but not
candidate-written files in the disposable output directory; a 400 KB file
succeeds under a 1 KB declared limit. Both violate binding ACs.

## Repair scope

1. Build a reproducible *minimal* read-only runtime closure. It may grant
   exact executable/library/resource files and narrow required directories,
   but never a package-manager prefix such as `/opt/homebrew`. The profile must
   deny an unrelated file under the former prefix while allowing the runtime to
   start. Do not call necessary explicitly enumerated interpreter bytes
   "candidate authority"; test that the grant cannot be widened to sibling
   Homebrew packages/configuration.
2. Enforce `maxOutputBytes` over candidate-visible data during execution, not
   only parent stdout/stderr. An OS file-size limit is preferred where
   available; otherwise use an equally enforceable runtime boundary that fails
   before/at the declared limit. Post-run deletion or post-hoc measurement is
   not a quota.
3. Preserve full Prolog source language and fail-closed platform behavior. Do
   not repair through parser/AST/source filtering or a permissive fallback.

## Mandatory execution evidence

| Probe | Required observation |
|---|---|
| full-Prolog candidate | still executes |
| SWI runtime start | works with the minimized allowlist |
| `/etc/hosts` | denied |
| unrelated file under `/opt/homebrew` (or actual package manager root) | denied |
| external `/tmp` write | denied and absent |
| network socket | denied |
| candidate output above `maxOutputBytes` | fails under the declared quota |
| lifecycle/proof/unknown/revision/conflict/timeout | previous evidence remains green |

The alpha report must distinguish granted interpreter runtime files from a
general host filesystem capability and name the mechanism enforcing the file
quota. A fresh beta must independently reproduce every row.

## Fresh alpha dispatch

```text
Role: fresh CDD alpha repair R2 for issue #23 on cycle/23.
Read the binding design/scaffold, both beta reviews and both gamma repairs.
Repair only broad Homebrew read authority and missing actual output quota.
Implement a default-deny minimal runtime closure and executable file-size
bound; retain full Prolog and no permissive fallback. Add actual hostile probes
listed here and preserve all prior logical checks. Update alpha
self-coherence; run focused/full/diff checks; commit/push alpha-only work.
No provider/live/CDR action, beta/gamma artifact, merge or issue closure.
```
