# Prolog cognitive memory v1

Status: proposed design for CDD issue #23.  
Date: 2026-09-06.  
Research boundary: this design does not establish that Prolog improves LLM
answers; it defines the system to be tested later.

## Purpose

The system is an LLM with an enduring, executable Prolog model of its
accumulated knowledge. The LLM interprets language and proposes changes to
that model. Prolog evaluates accepted facts and rules. The result supplied to
the LLM is a proof object: what followed, through which rules, from which
source assertions, and which relevant goals could not be established.

The intended loop is:

```text
dialogue -> LLM proposal -> parse and validate -> accepted Prolog memory
        -> query -> proof / missing-goal explanation -> LLM answer or question
        -> reflection may propose a revised fact or rule
```

The engine is not merely a key-value store. Its central functions are
multi-step relational inference, explicit contradiction checks, revision of
accepted knowledge, and explanation of conclusions.

## Thought language and authority boundary

The agent's thought language is **full Prolog**, not a JSON AST and not a
small artificial Prolog subset. A system that is meant to learn how to reason
in Prolog should first be able to use Prolog's actual expressive resources.
The exploratory program may define predicates, use recursion, negation,
disjunction, arithmetic, meta-programming and directives. We will learn which
of those facilities need later policy boundaries by observing actual useful
programs, rather than by guessing a tiny language up front.

This does *not* give a thought program authority over the host. It is executed
as a frozen, capability-empty Prolog session: a fresh working directory,
read-only memory snapshot, no network, no host-file authority, no durable
database authority, and explicit CPU/time/memory/output limits. The system
does not `consult` a thought program into its own trusted process. It launches
an isolated Prolog runtime whose only inputs and outputs are declared files or
streams.

JSON may remain a transport or persistence container outside the agent-facing
language, but it is not the language in which knowledge is authored.

Example:

```prolog
propose_fact(p1, lives_in(user, samara),
             source(turn(12)), explicit).

propose_rule(r1,
             requires_approval(Project, two) :-
                 owned_by(Project, acme),
             source(turn(21)), explicit).
```

The runtime can parse source into native Prolog terms for attribution,
instrumentation and source locations, but that term tree is an implementation
detail, not a language gate. There is no bespoke grammar or structural
allowlist in the exploratory phase.

The only durable boundary is a versioned snapshot transition: a proposed
program/change is stored with identity, source and observed run evidence; it
becomes a new memory snapshot only through an explicit admission decision.
The decision can initially be human or policy-driven. It is deliberately not
confused with syntax acceptance.

## Knowledge lifecycle

Every accepted item has an immutable identity, its source span, status and
validity interval. A new proposal is an operation over this history:

```prolog
propose_revision(p2, assertion(a2, lives_in(user, kazan)),
                 replaces(a1), source(turn(18)), explicit).

propose_hypothesis(h1,
                   requires_approval(Project, two) :- owned_by(Project, acme),
                   support([a5, a8, a11])).
```

An explicit statement can become accepted after schema, registry, source and
consistency checks. A hypothesis remains quarantined unless a later policy
admits it. A rule is never trusted merely because it parses or produces useful
consequences.

## Compilation and execution

Each thought run starts from an immutable memory/program snapshot plus an
explicit proposed source delta. It is executed by a fresh isolated Prolog
runtime. The session may change its own ephemeral database and build auxiliary
programs, but it cannot mutate the source snapshot, the host, or another run.
The output is a new candidate snapshot/delta and run evidence. Admission is a
separate policy step.

Thus the agent receives the language it needs for genuine reasoning, while
the outer system retains temporal history, provenance and rollback. Revision
edges and validity intervals determine which admitted assertions are active at
a query time. Current trusted rules may contain domain-independent operations
such as active-state selection, temporal overlap and direct-polarity conflict.

## Proof objects

`true` and `false` are insufficient results. A successful query returns a
proof DAG. Each node carries the resolved goal, substitution, rule or fact ID,
and source reference.

```text
affected(orion)
  r2: affected(X) :- depends_on(X,Y), affected(Y)  {X=orion,Y=delta}
    a1: depends_on(orion, delta)                   [turn 12]
    r1: affected(X) :- vulnerable(X)               {X=delta}
      a2: vulnerable(delta)                        [turn 31]
```

A failed query returns a bounded missing-goal report, not a claim of negation:

```text
cannot establish requires_approval(orion, two)
missing: owned_by(orion, acme)
```

Execution tracing remains a debugging surface. The proof object is the agent
and user-facing explanation surface.

## Contradiction handling

Direct logical conflict is detected only when the same predicate and arguments
have positive and negative active assertions whose validity intervals overlap.
The result is a proof-backed conflict record with both source IDs. Semantic
tension between different predicates remains an LLM/reflection hypothesis and
does not become a Prolog contradiction automatically.

Unknown, planned, historical, retracted and conflicting are distinct states.
Failure to prove a goal is not proof of its negation.

## Reflection / self-construction

Reflection receives a frozen memory snapshot and proof objects. It may write
and execute a complete candidate Prolog delta in its isolated session,
including a program that constructs another program. It must retain the
source/support set and run evidence used to form the proposal. Counterexample
search and consistency checks can reject or weaken a candidate, but do not turn
an induced result into an admitted memory snapshot automatically.

This is the initial self-building mechanism: the knowledge program evolves
through auditable, reversible snapshots. Host sandbox configuration and the
outer admission controller remain outside the self-modifying program.

## Evaluation implications

Later CDR evaluation has three separate measurements:

1. whether the LLM formalizes text into correct facts/rules;
2. whether Prolog produces correct conclusions and proof objects from a fixed
   knowledge program;
3. whether the LLM uses those proof objects to answer users more reliably.

The first v1 demonstration should use multi-hop inference, revision and
time-aware conflict cases. A recent-turn baseline and a structured-memory
baseline must receive the same source facts and question. The Prolog condition
adds the proof-backed query result, so the measured contribution is explicit
logical execution rather than merely a different memory serialization.

## Deferred choices

- how observed full-Prolog use should inform future language/policy profiles;
- automatic admission criteria for candidate snapshots and induced hypotheses;
- proof extraction that remains useful for arbitrary meta-programmed code;
- blind free-text evaluation and long-context holdout construction.

These are not silently adopted by v1.
