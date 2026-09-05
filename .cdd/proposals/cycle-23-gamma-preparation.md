# Gamma preparation: CDD cycle for issue #23

Date: 2026-09-06 (Europe/Samara)
Role: gamma  
Issue: https://github.com/Das-dasein/prologos/issues/23  
Mode: design-and-build  
State: `READY-BLOCKED-ON-PR-24-REVIEW`

## Selected gap

The project aim is an LLM with an enduring Prolog model that can perform and
explain logical inference. The current pipeline proves neither: extraction is
fact-only, B3 computes much of its state outside Prolog, and B4 exposes no
proof. Issue #23 implements the smallest vertical slice of this architecture:
safe restricted proposals -> accepted knowledge -> isolated Prolog query ->
proof DAG or missing-goal explanation.

This supersedes the previous evaluator-first preparation. Scoring free text is
important only after the system has a distinct logical result to evaluate.

## Candidate table

| Candidate | Dependency reading | Decision |
|---|---|---|
| Prolog proposal and proof core | Makes the intended symbolic/logical contribution executable | selected |
| Structured evaluator v4 | Needs a meaningful proof-backed output contract | deferred |
| B3/B4 runtime isolation | Needs accepted rule/proof semantics | deferred |
| Long-context holdout | Needs the core and runner contract | deferred |
| Lucid/reflection hypothesis induction | Needs proposal lifecycle and proof core | descendant cycle |

## Branch gate

PR #24 contains the preflight and prior bounded evaluator work required as the
base but must receive independent beta review before merge. The untracked
partial raw directory `reports/live-20260905-225936/` is excluded from the PR
and every future cycle artifact. After PR #24 merges, gamma refreshes
`origin/main`, creates `cycle/23`, then commits the scaffold below before
dispatching fresh alpha.

## Planned gamma scaffold

Issue #23 is the complete contract. Alpha must read
`.cdd/designs/prolog-cognitive-memory-v1.md` before implementation.

Expected surfaces:

- proposal parser and AST;
- registry/lifecycle adapter;
- isolated Prolog program compiler/query layer;
- proof DAG and missing-goal representation;
- fixtures and focused test command;
- `self-coherence.md` using the canonical bare headers.

Compatibility peers to enumerate:

- `llm-schema.js`, `ontology-registry.js`, `memory-store.js`;
- `prolog-engine.js`, `memory.pl`, `domain-rules.pl`, `pilot-runner.js`;
- every current consumer of assertion, revision, conflict and provenance
  symbols;
- all existing tests and fixture producers found with `rg`.

Acceptance oracle:

| AC group | Required evidence |
|---|---|
| Parser/safety | unsafe proposal fixtures reject before an isolated session exists |
| Rules/AST | variable sharing survives parse and compilation |
| Lifecycle | explicit, revision and hypothesis fixtures preserve status/history |
| Execution | a multi-hop conclusion is derived by Prolog, not JavaScript |
| Explanation | proof DAG names rules, substitutions, facts and original turns |
| Conflict | overlapping polarity conflict returns both sources; non-overlap does not |
| Regression | focused proof suite, project regression suite and trusted hashes pass |

Constraints:

- no live provider call or partial-run inspection;
- agent proposal text is restricted Prolog; internal AST is not a new
  agent-facing language;
- never `consult` untrusted agent output;
- no automatic promotion of induced rules or mutation of trusted kernel code;
- no CDR claim or receipt.

## Alpha dispatch

```text
Role: fresh CDD alpha for issue #23 on branch cycle/23.

Read issue #23, .cdd/designs/prolog-cognitive-memory-v1.md and the committed
gamma scaffold. Load CDD alpha and the relevant project/CDR boundary skills.
Implement only the AC-backed v1 vertical slice. Maintain canonical
self-coherence. Run focused proof tests and all relevant regressions.

Do not invoke a provider, consume the partial live directory, auto-accept an
induced hypothesis, alter the trusted kernel through a proposal, emit a CDR
receipt or assert PAM-C1. Return immutable commit, commands, results, changed
surfaces and named debt only.
```

## Beta dispatch

```text
Role: fresh independent CDD beta for issue #23 on branch cycle/23.
Review only the immutable alpha target against issue #23 and the gamma scaffold.
Reproduce parser safety, AST variable preservation, isolated multi-hop Prolog
derivation, proof DAG provenance, failed-goal semantics, revision and temporal
conflict fixtures plus full regressions. Confirm no untrusted proposal is
consulted, no hypothesis is silently active and no CDR/live claim entered.

Approve only the exact reviewed target when every AC holds. Otherwise issue
reproducible REQUEST CHANGES findings. Do not issue a CDR receipt.
```
