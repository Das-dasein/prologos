# Alpha self-coherence: issue #23

## Gap

The existing store accepts structured facts but cannot execute a full-Prolog
candidate delta from a frozen snapshot or return an inspectable multi-hop
derivation. This α slice adds that separate cognitive boundary without changing
the current extraction, registry, persistent memory, pilot, or provider paths.

## Skills

Loaded authority: issue #23, `prolog-cognitive-memory-v1.md`, this cycle's
gamma scaffold, the CDD README and assertion lifecycle. No beta/gamma role
artifact, CDR receipt, provider, or live archive was used.

## ACs

`cognitive-memory.js` makes immutable snapshot/candidate objects; candidates
remain `candidate` in run evidence and `admitCandidate` requires an explicit
decision to produce a new snapshot. `cognitive-runner.pl` loads snapshot items
and candidate source only in a fresh SWI process and emits its native
multi-hop proof DAG or bounded unknown/missing-goal JSON on stdout; there is
no result file or candidate-writable output directory. The focused fixture
also demonstrates a full-Prolog candidate with `member/2`, direct temporal
polarity conflict with both source IDs, non-overlap, and revision removing the
replaced item from active state.

## Self-check

Compatibility peers enumerated: `llm-schema.js`, `ontology-registry.js`,
`memory-store.js`, `prolog-engine.js`, `memory.pl`, `domain-rules.pl`, and
`pilot-runner.js`. They are intentionally unchanged: their registered
fact-only ingestion remains a separate compatibility surface.

`npm run test:cognitive-memory` passes. The test verifies the conclusion is
derived through `r2` then `r1`, not stored as a fact; candidate status remains
unadmitted; absence is `unknown`, not negation; and actual candidate execution
is denied for `/etc/hosts`, an external `/tmp` write (the path remains absent),
a split-file write attempt in its read-only working directory, and a socket
connection. It also proves that an unrelated `/opt/homebrew/.gitignore` file
is denied while an unrestricted `member/2` candidate executes. A candidate
which writes 400,000 bytes to stdout fails when `maxOutputBytes` is 1024: Node
counts the child stdout and stderr together and kills/rejects an over-limit
run. The runner's stdout JSON is the only accepted result protocol; candidate
file output has no grant whatsoever. The runner uses a macOS Seatbelt
`sandbox-exec` **default-deny** profile, a fresh read-only input directory, a
64 MiB SWI stack limit, and wall timeout. Its read grants are the specific SWI
Cellar runtime directory, directly loaded dylib directories, system runtime
libraries/devices, and declared inputs; it does not grant a package-manager
root such as `/opt/homebrew`. It has no permissive fallback and fails closed
when the macOS boundary is unavailable. Candidate source is never loaded into
the Node host process.

## Debt

The verified runtime boundary is macOS-specific: non-macOS hosts and a missing
`/usr/bin/sandbox-exec` fail closed. `maxOutputBytes` is an exact aggregate
bound over bytes exposed on the child stdout/stderr pipes; it is not a general
CPU, heap, or descriptor quota. Arbitrary full-Prolog candidate execution has
a truthful `trace_unavailable` result when it cannot be reconstructed as a
proof from accepted snapshot clauses; proof extraction for arbitrary
meta-programmed code is deferred by design.

## CDD Trace

Issue #23 → binding design section "Thought language and authority boundary"
and "Compilation and execution" → `cognitive-memory.js` and
`cognitive-runner.pl` → `test-cognitive-memory.js` → this α report. This is
CDD implementation evidence only, not a CDR result or usefulness claim.
