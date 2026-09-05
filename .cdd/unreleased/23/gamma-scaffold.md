# Gamma scaffold: cycle 23

Issue: GitHub #23, `CDS: make Prolog an explainable cognitive memory layer`.
Branch: `cycle/23`.
Base: `6dc3d412188c8f29ed3e17031ef6335eb27118d6`.
Mode: design-and-build.

## Selected gap

The project has structured extraction and a Prolog-backed store, but the agent
cannot yet author a safe restricted rule proposal and receive an explainable
logical result. Current B3/B4 experiments are not evidence for that capability:
important state is computed in JavaScript and a query has no proof object.

This cycle builds the smallest executable cognitive layer:

```text
restricted Prolog proposal -> parsed AST -> accepted lifecycle state
  -> isolated Prolog query -> proof DAG | bounded missing-goal report
```

This is not an evaluator rewrite, a live provider run, or a claim that Prolog
improves answers. The agent-facing language is restricted Prolog proposal text;
an AST is an internal safety boundary, not a replacement authoring language.

## Design authority

Alpha must read [prolog-cognitive-memory-v1.md](../../designs/prolog-cognitive-memory-v1.md)
and issue #23 before code. The design is binding for the proposal language,
lifecycle, isolated execution, proof semantics, conflict boundary and deferred
self-construction scope.

## Expected surfaces

- a parser for the v1 restricted proposal grammar and its AST;
- accepted explicit/revision/hypothesis lifecycle adapter;
- isolated Prolog compiler/query layer, never consulting proposal text;
- proof-DAG and missing-goal output types;
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
| Parser/safety | directives, modules, I/O, database mutation, meta-calls, cut, NAF, disjunction, arithmetic and unsupported syntax reject before a Prolog session exists |
| Rules/AST | parsed Horn rules preserve variable sharing when compiled |
| Lifecycle | explicit, revision and hypothesis fixtures preserve immutable identity/status/history; hypotheses are inactive until explicit admission |
| Execution | a multi-hop conclusion is derived in isolated Prolog, not precomputed in JavaScript |
| Explanation | proof DAG names rule IDs, substitutions, fact IDs and source turns |
| Failure | unproved queries return a bounded missing-goal report and never a negation claim |
| Conflict | overlapping active polarities return both sources; non-overlap does not conflict |
| Regression | focused suite, relevant full regression, trusted hashes and `git diff --check` pass |

## Explicit constraints

- No provider invocation, live/raw run inspection, CDR receipt or PAM-C1 claim.
- Never `consult` or execute untrusted proposal text.
- No automatic promotion of induced hypotheses or mutation of parser, validator
  or trusted inference kernel through a proposal.
- Do not silently broaden v1 with recursion, NAF, disjunction, arithmetic,
  rule priorities or an s-expression syntax.
- Alpha configures commit identity as `alpha@prologos.cdd.cnos`.
- Alpha writes canonical self-coherence with bare headers: `## Gap`,
  `## Skills`, `## ACs`, `## Self-check`, `## Debt`, `## CDD Trace`.
- Review-readiness is forbidden until the loaded alpha pre-review gate passes.

## Alpha dispatch

```text
Role: fresh CDD alpha for issue #23 on branch cycle/23.

Read issue #23, .cdd/designs/prolog-cognitive-memory-v1.md and
.cdd/unreleased/23/gamma-scaffold.md. Implement only the AC-backed v1
vertical slice. Enumerate compatibility peers and maintain canonical
self-coherence. Run focused proof tests and relevant full regressions.

No provider calls; no partial live directory; no automatic hypothesis
acceptance; no trusted-kernel self-modification; no CDR receipt or PAM-C1
claim. Return immutable commit, commands/results, changed surfaces and
named debt. Do not author beta/gamma verdicts, merge, or close the issue.
```

## Beta dispatch

```text
Role: fresh independent CDD beta for issue #23 on branch cycle/23.
Review only the immutable alpha target against issue #23, the design and this
gamma scaffold. Reproduce parser safety, AST variable preservation, isolated
multi-hop derivation, proof DAG provenance, failed-goal semantics, revision
and temporal conflict fixtures plus full regressions. Confirm that no
untrusted proposal is consulted and no hypothesis is silently active.

Approve only the exact reviewed target when every AC holds; otherwise issue
reproducible REQUEST CHANGES findings. Do not issue a CDR receipt.
```
