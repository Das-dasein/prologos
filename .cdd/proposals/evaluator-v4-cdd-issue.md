# CDS: make Prolog an explainable cognitive memory layer

Labels: `design`, `P2`

Mode: **design-and-build**  
Protocol: **CDS**, consumed later by CDR wave `prolog-memory-eval-v0`  
Priority: **P2, dependency-first** — a live comparison is meaningless until
the Prolog condition has a distinct, inspectable logical contribution.

## Problem

The current project extracts JSON assertion candidates and uses Prolog for a
bounded query path, but the agent-facing language cannot express a rule with
variables and a body. B3 already computes parts of the active/conflict state
in JavaScript, B4 receives a mixture of that state and a Prolog result, and
the answer path exposes neither a proof nor a meaningful missing-goal report.

The current pilot therefore does not test the intended system: an LLM whose
enduring Prolog model can accumulate facts and rules, perform multi-step
inference, expose the grounds of a conclusion, and accept auditable proposals
for revision or hypothesis.

## Impact

Without an explicit proposal language and proof surface, Prolog risks being a
decorative backend. The LLM cannot inspect how a predicate was resolved, users
cannot distinguish an unsupported answer from a derivation, and CDR cannot
test the contribution of logical execution separately from JSON formatting or
different context construction.

## Status truth

- `memory-extraction-v2` supports registered base facts with qualifiers; it
  does not support agent-authored general rules.
- A limited reflection hypothesis shape exists, but it is not the normal
  proposal, acceptance, execution and proof pipeline.
- Current offline evaluator v3 is a bounded replay diagnostic, not a valid
  assessment of the intended cognitive memory architecture.
- No live output establishes PAM-C1 or usefulness of Prolog.

## Source of truth

| Surface | Canonical source | Status |
|---|---|---|
| Target architecture | `.cdd/designs/prolog-cognitive-memory-v1.md` | proposed by this cycle |
| Current extraction contract | `llm-schema.js` | fact-only |
| Current execution path | `pilot-runner.js`, `prolog-engine.js`, `memory.pl`, `domain-rules.pl` | bounded, no proof object |
| Assertion/registry discipline | `.cdd/assertion-lifecycle-v1.md`, `ontology-registry.js` | binding compatibility surface |
| Research boundary | `.cdr/POLICY.md`, `.cdr/waves/prolog-memory-eval-v0/status.md` | CDR `REVISE` |

## Scope

In scope:

- implement the restricted Prolog proposal language in the design document;
- parse proposal text into an internal AST without consulting arbitrary code;
- validate grammar, registry identities, source references and safety rules;
- support explicit facts, revisions, explicit rules and quarantined hypotheses;
- compile accepted knowledge into isolated Prolog sessions;
- return proof DAGs for successful goals and bounded missing-goal reports for
  failed goals;
- detect direct time-aware polarity conflicts with both evidence chains;
- provide an end-to-end local demonstration of multi-hop inference, revision,
  conflict and explanation.

Out of scope:

- arbitrary Prolog, directives, I/O, database mutation, meta-calls, rule
  priorities, negation-as-failure and unrestricted recursion;
- autonomous acceptance of induced hypotheses;
- a new paid LLM run, JSON evaluator v4, statistical conclusions or PAM-C1;
- long-context dataset authoring and blind free-text judging;
- changing trusted kernel code through reflection.

## Cycle scope sizing

| Factor | Reading | Splitting signal? |
|---|---|---|
| New code surface | parser, proposal store, proof engine and fixtures | yes |
| Cross-module breadth | schema, memory, Prolog, tests and docs | yes |
| Lifecycle span | design, implementation and proof demo | yes |
| MCA stability | architecture now committed in the design doc | no |
| Independent shippability | proposal language and proof engine need each other | no |

Decision: this is the master design-and-build issue. Alpha may implement the
minimum vertical slice only: safe proposal parser, accepted facts/rules,
isolated query and proof DAG. Hypothesis induction and live evaluation are
separate descendants.

## Acceptance criteria

### AC1: Restricted proposal parser

Only the v1 grammar in the design document parses. Directives, modules,
database mutation, meta-calls, I/O, cut, disjunction, arithmetic and forbidden
predicates reject before execution.

### AC2: Facts and general rules

An agent proposal can represent a source-backed fact and a source-backed Horn
rule containing shared variables and a conjunction body. The AST preserves
variables, terms and source identifiers without reducing them to strings.

### AC3: Lifecycle and trust state

Explicit facts/rules, revisions and hypotheses retain immutable IDs, sources,
intervals and status. Hypotheses remain unavailable to normal inference until
an explicit acceptance operation admits them.

### AC4: Isolated logical execution

Accepted program items execute in a fresh session without mutating trusted
Prolog files. A multi-hop query succeeds through at least two rule applications
and is not precomputed in JavaScript.

### AC5: Proof and absence explanations

A successful query returns a structured proof DAG with resolved substitutions,
rule IDs, fact IDs and original source references. A failed query reports
bounded unsatisfied goals and does not assert negation.

### AC6: Revision and direct conflict

Revision changes active state without erasing history. Opposite-polarity facts
with overlapping intervals return a conflict record containing both sources;
non-overlap does not.

### AC7: Proof and regression gates

Focused tests demonstrate the four canonical scenarios: multi-hop derivation,
revision, time-aware conflict and rejected unsafe proposal. Existing
regressions pass. No provider call, live artifact, CDR receipt or superiority
claim enters the cycle.

## Proof plan

The proof oracle is an isolated query over accepted AST-derived clauses and its
proof DAG. Positive fixtures require a conclusion that does not occur as a
literal stored fact. Negative fixtures must fail before consulting Prolog or
return an explicit unknown/missing-goal result. Tests verify trusted-file hashes
before and after every session.

## Skills to load

- CDD loader, CDD alpha/beta roles, design, plan, issue and review skills;
- CDR policy for claim/evidence boundary;
- current JavaScript/Tau-Prolog, ontology registry and assertion lifecycle
  surfaces.

## Related artifacts

- GitHub #20 — future evaluation matrices.
- GitHub #21 — future live pilot, blocked on this logical core.
- `.cdd/designs/prolog-cognitive-memory-v1.md`.
- `.cdr/proposals/evaluation-contract-repair-v3.md` — evaluator repair remains
  deferred until the architecture emits meaningful proof-backed outputs.

## Non-goals

This cycle does not claim that a model understands arbitrary natural language,
that all semantic contradictions are decidable, or that Prolog is superior to
all non-Prolog implementations. It constructs the concrete logical system that
later CDR evaluates.

## Success / closure condition

The issue closes only after an independent CDD beta reproduces all AC evidence
from the immutable target commit and verifies that the implementation exposes
logical derivations to the LLM-facing layer rather than hiding them behind a
boolean result.
