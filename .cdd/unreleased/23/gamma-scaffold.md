# Gamma scaffold: cycle 23

Issue: GitHub #23, `CDS: make Prolog an explainable cognitive memory layer`.
Branch: `cycle/23`.
Base: `6dc3d412188c8f29ed3e17031ef6335eb27118d6`.
Mode: design-and-build.

## Selected gap

The project has structured extraction and a Prolog-backed store, but the agent
cannot yet run a full Prolog thought program against a frozen memory snapshot
and receive an explainable logical result. Current B3/B4 experiments are not
evidence for that capability: important state is computed in JavaScript and a
query has no proof object.

This cycle builds the smallest executable cognitive layer:

```text
frozen program/memory snapshot + full Prolog thought delta
  -> capability-empty isolated Prolog session -> untrusted transcript/candidate
accepted snapshot + query -> separate trusted Prolog runtime
  -> proof DAG | bounded missing-goal report
```

This is not an evaluator rewrite, a live provider run, or a claim that Prolog
improves answers. The agent-facing language is full Prolog. Native term parsing
may support provenance/tracing but is not an allowlist, a bespoke grammar, or a
replacement authoring language. We first observe what the agent needs, then
derive future policy profiles from evidence.

## Design authority

Alpha must read [prolog-cognitive-memory-v1.md](../../designs/prolog-cognitive-memory-v1.md)
and issue #23 before code. The design is binding for the proposal language,
lifecycle, isolated execution, proof semantics, conflict boundary and deferred
self-construction scope.

## Expected surfaces

- frozen snapshot/candidate-delta lifecycle adapter;
- capability-empty isolated full-Prolog runtime, never loading candidate text
  into the host process;
- separate untrusted thought transcript and trusted proof-DAG/missing-goal
  output types;
- direct active temporal polarity conflict evidence;
- fixtures, focused proof suite, project regression, and canonical
  `self-coherence.md`.

Compatibility peers to enumerate before closure:

- `llm-schema.js`, `ontology-registry.js`, `memory-store.js`;
- `prolog-engine.js`, `memory.pl`, `domain-rules.pl`, `pilot-runner.js`;
- all assertion/revision/conflict/provenance consumers found by `rg`;
- current tests and fixture producers.

## Acceptance oracle

| AC | Required evidence |
|---|---|
| Isolation | full-Prolog constructs execute in the thought runtime while host file/network/durable-memory authority remains unavailable |
| Snapshot lifecycle | candidate changes preserve immutable identity, source, run evidence and history; no candidate is admitted silently |
| Trusted execution | a multi-hop conclusion is derived from an accepted snapshot in a trusted Prolog runtime, not precomputed in JavaScript or emitted by a candidate |
| Explanation | trusted proof DAG names rule IDs, substitutions, fact IDs and source turns |
| Failure | unproved queries return a bounded missing-goal report and never a negation claim |
| Conflict | overlapping active polarities return both sources; non-overlap does not conflict |
| Regression | focused suite, relevant full regression, trusted hashes and `git diff --check` pass |

## Explicit constraints

- No provider invocation, live/raw run inspection, CDR receipt or PAM-C1 claim.
- Never load a candidate into the host process or give it host/network/durable
  memory authority; run it only in a fresh bounded session.
- Never accept candidate stdout, exit code or self-produced JSON as trusted
  proof evidence. Trusted proof runtime loads accepted snapshot material only.
- No automatic admission of induced candidate snapshots and no mutation of the
  outer sandbox/admission controller through a thought program.
- Do not impose a bespoke parser, structural allowlist or artificial Prolog
  subset in this exploratory cycle.
- Alpha configures commit identity as `alpha@prologos.cdd.cnos`.
- Alpha writes canonical self-coherence with bare headers: `## Gap`,
  `## Skills`, `## ACs`, `## Self-check`, `## Debt`, `## CDD Trace`.
- Review-readiness is forbidden until the loaded alpha pre-review gate passes.

## Alpha dispatch

```text
Role: fresh CDD alpha for issue #23 on branch cycle/23.

Read issue #23, .cdd/designs/prolog-cognitive-memory-v1.md and
.cdd/unreleased/23/gamma-scaffold.md. Implement only the AC-backed exploratory
vertical slice: frozen snapshots, a capability-empty isolated full-Prolog
thought runtime, candidate lifecycle, and the best proof/trace boundary that
the execution supports. Enumerate compatibility peers and maintain canonical
self-coherence. Run focused proof tests and relevant full regressions.

No provider calls; no partial live directory; no automatic candidate admission;
no outer-sandbox/admission-controller self-modification; no CDR receipt or
PAM-C1 claim. Do not build a restricted grammar or allowlist. Return immutable
commit, commands/results, changed surfaces and named debt. Do not author
beta/gamma verdicts, merge, or close the issue.
```

## Beta dispatch

```text
Role: fresh independent CDD beta for issue #23 on branch cycle/23.
Review only the immutable alpha target against issue #23, the design and this
gamma scaffold. Reproduce sandbox isolation for full-Prolog constructs,
candidate non-admission, isolated multi-hop derivation, proof/trace provenance,
failed-goal semantics, revision and temporal conflict fixtures plus full
regressions. Confirm the host never loads a candidate and no candidate is
silently admitted.

Approve only the exact reviewed target when every AC holds; otherwise issue
reproducible REQUEST CHANGES findings. Do not issue a CDR receipt.
```
