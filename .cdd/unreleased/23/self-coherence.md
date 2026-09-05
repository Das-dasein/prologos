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
and candidate source only in a fresh SWI process and returns a native
multi-hop proof DAG or bounded unknown/missing-goal result. The focused fixture
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
and a socket connection. It also executes the unrestricted `member/2`
candidate. The runner uses a macOS Seatbelt `sandbox-exec` **default-deny**
profile, a fresh temporary directory, read-only input files, one disposable
output directory, a 64 MiB SWI stack limit, wall timeout, and output-byte
limit. Its grants are the SWI/Homebrew runtime and signed dynamic dependencies,
system runtime libraries/devices, declared inputs, and the disposable run
directory; it has no permissive fallback and fails closed when the macOS
boundary is unavailable. Candidate source is never loaded into the Node host
process.

## Debt

The verified runtime boundary is macOS-specific: non-macOS hosts and a missing
`/usr/bin/sandbox-exec` fail closed. The Homebrew runtime prefix is read-only
because its signed loader uses `opt`/`Cellar` indirections; it is runtime
compatibility scope rather than candidate storage. Arbitrary full-Prolog
candidate execution has a truthful `trace_unavailable` result when it cannot
be reconstructed as a proof from accepted snapshot clauses; proof extraction
for arbitrary meta-programmed code is deferred by design.

## CDD Trace

Issue #23 → binding design section "Thought language and authority boundary"
and "Compilation and execution" → `cognitive-memory.js` and
`cognitive-runner.pl` → `test-cognitive-memory.js` → this α report. This is
CDD implementation evidence only, not a CDR result or usefulness claim.
