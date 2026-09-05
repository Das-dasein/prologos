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

## Proposal language

The agent returns a **restricted Prolog proposal program**, not a JSON AST.
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

The parser builds an internal AST. It accepts only the grammar below; it never
consults the proposal as arbitrary executable Prolog.

### v1 grammar

- atoms, variables, compound terms and lists only where the registry permits;
- facts and Horn clauses with a single head and conjunction-only body;
- explicit `source/1`, `explicit | inferred | hypothesis` epistemic status;
- rule identifiers and assertion identifiers;
- no directives, modules, I/O, database mutation predicates, meta-calls,
  foreign predicates, cut, negation-as-failure, disjunction, arithmetic or
  unbounded recursion in v1.

The grammar is intentionally small. It supports a useful logical core while
keeping parsing, provenance and termination reviewable. New language features
are versioned extensions rather than model improvisation.

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

Accepted items are compiled into an isolated Prolog program with stable source
identifiers. Query execution occurs in a fresh session so that proposals cannot
mutate trusted memory. Revision edges and validity intervals determine which
assertions are active for a query time.

The current trusted rules may contain domain-independent operations such as
active-state selection, temporal overlap and direct-polarity conflict. The
agent may propose domain rules in the restricted grammar, but acceptance is a
separate policy step.

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

Reflection receives a frozen memory snapshot and proof objects. It may propose
facts, revisions and hypotheses in the same proposal language. It must retain
the source or support set used to form the proposal. Counterexample search and
consistency checks can reject or weaken a proposal, but do not turn an induced
rule into an explicit fact.

This is the initial implementation of the self-building aspect: the knowledge
program evolves through auditable proposals. Self-modification of the parser,
validator or trusted inference kernel is outside v1.

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

- whether a future proposal language should use an s-expression syntax;
- recursion, explicit negation, defeasible rules and rule priorities;
- automatic acceptance criteria for induced hypotheses;
- blind free-text evaluation and long-context holdout construction.

These are not silently adopted by v1.
