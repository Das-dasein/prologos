# Alpha self-coherence: issue #23

## Gap

The existing store accepts structured facts but cannot safely treat the output
of an unrestricted full-Prolog candidate as logical proof: `initialization/1`
can print JSON and halt before any shared runner protocol completes. This α
repair separates exploratory thought from proof authority without changing the
current extraction, registry, persistent memory, pilot, or provider paths.

## Skills

Loaded authority: issue #23, `prolog-cognitive-memory-v1.md`, the cycle 23
scaffold, and the recorded gamma trust-boundary reframe plus preceding
isolation findings. No provider, live archive, CDR receipt, beta/gamma verdict,
merge, or closure action was produced.

## ACs

`cognitive-memory.js` makes immutable snapshot/candidate objects; candidates
remain `candidate` in run evidence and `admitCandidate` requires an explicit
decision to produce a new snapshot. `cognitive-runner.pl` is a fresh,
capability-empty full-Prolog thought process: its stdout/stderr and exit state
are captured only as bounded, explicitly `untrusted` transcript evidence and
are never JSON-parsed as a result. `trusted-query-runner.pl` is a separate
fresh process which receives only the accepted snapshot and query. It alone
owns JSON proof-DAG/bounded-missing-goal protocol and does not receive or
consult candidate source. Snapshot `pam_item/3` text is transport data there:
the trusted runner neither `assertz`s nor `call`s it, and its proof interpreter
only traverses fact/rule-shaped terms. Directives, meta-calls, and host-control
built-ins therefore have no trusted executable authority. The focused fixture also demonstrates a full-Prolog
candidate with `member/2`, direct temporal polarity conflict with both source
IDs, non-overlap, and revision removing the replaced item from active state.

## Self-check

Compatibility peers enumerated: `llm-schema.js`, `ontology-registry.js`,
`memory-store.js`, `prolog-engine.js`, `memory.pl`, `domain-rules.pl`, and
`pilot-runner.js`. They are intentionally unchanged: their registered
fact-only ingestion remains a separate compatibility surface.

`npm run test:cognitive-memory` passes. The test verifies the trusted-query
conclusion is derived through `r2` then `r1`, not stored as a fact; candidate
status remains unadmitted; absence is `unknown`, not negation; and actual
candidate execution is denied for `/etc/hosts`, an external `/tmp` write (the
path remains absent), a split-file write attempt in its read-only working
directory, and a socket connection. It also proves that an unrelated
`/opt/homebrew/.gitignore` file is denied while an unrestricted `member/2`
candidate executes. A candidate which writes 400,000 bytes to stdout fails
when `maxOutputBytes` is 1024: Node counts the child stdout and stderr together
and kills/rejects an over-limit run. The test executes the exact hostile
`initialization/1` forged-JSON plus `halt/0` candidate; its bytes are retained
only in the untrusted transcript, while a subsequent independent trusted query
for `never` returns `unknown`, not the forged `proved` result. The same result
holds after explicitly admitting that raw candidate: its `initialization/1`
remains lifecycle material and is not executed by the trusted interpreter. The
runner uses
a macOS Seatbelt
`sandbox-exec` **default-deny** profile, a fresh read-only input directory, a
64 MiB SWI stack limit, and wall timeout. Its read grants are the specific SWI
Cellar runtime directory, directly loaded dylib directories, system runtime
libraries/devices, and declared inputs; it does not grant a package-manager
root such as `/opt/homebrew`. It has no permissive fallback and fails closed
when the macOS boundary is unavailable. Candidate source is never loaded into
the Node host process or the trusted query process.

## Debt

The verified runtime boundary is macOS-specific: non-macOS hosts and a missing
`/usr/bin/sandbox-exec` fail closed. `maxOutputBytes` is an exact aggregate
bound over bytes exposed on each child stdout/stderr pipe; it is not a general
CPU, heap, or descriptor quota. Thought transcript exit status is useful run
evidence but intentionally carries no truth/proof semantics. This is a
deliberate authority split: full-Prolog thought is not the trusted executable
memory language. The trusted query interpreter currently supports proof DAGs
over declarative fact/rule-shaped snapshot terms only; admission policy,
broader trusted rule semantics, and proof extraction for arbitrary
meta-programmed code remain deferred.

## CDD Trace

Issue #23 → binding design sections "Thought language and authority boundary"
and "Compilation and execution" → `cognitive-memory.js`,
`cognitive-runner.pl`, and `trusted-query-runner.pl` →
`test-cognitive-memory.js` → this α report. This is CDD implementation
evidence only, not a CDR result or usefulness claim.
