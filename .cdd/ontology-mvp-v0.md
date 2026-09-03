# Ontology MVP v0

## Goal

Allow the model to induce an ontology extension from dialogue: entities,
typed facts and bounded rules whose vocabulary is not tied to employment or
any other single domain. SWI-Prolog remains the execution and explanation
engine; the model does not get arbitrary filesystem or process access.

## First vertical slice

1. Input: one dialogue turn and the current ontology manifest.
2. LLM output: JSON containing `facts[]` and `rules[]`, never raw source files.
3. Validator: schema, allowlisted predicates, variables, rule size and
   stratification checks; reject on any violation.
4. Compiler: serialize accepted facts/rules into an isolated candidate `.pl`.
5. SWI worker: execute registered queries with a timeout.
6. Explanation: return derived answer, supporting rule, source claims and
   candidate version.

## Rule contract (v0)

- head and body predicates must be declared in the versioned ontology registry
  (the registry may contain domain-specific predicates proposed by the LLM);
- core runtime predicates are immutable and cannot be shadowed;
- body contains only declared predicates and conjunction (no cuts,
  directives, I/O, meta-call, consult, assert or retract);
- maximum 4 body goals and 6 variables;
- every free variable in the head occurs in the body;
- rules are versioned and immutable after acceptance;
- rejected proposals are retained as audit records, not executed.

The registry is extensible by declaration, not by silently accepting arbitrary
Prolog. This keeps the ontology universal while preserving a fail-closed
execution boundary.

## Acceptance checks

- malformed or unsafe rule is rejected fail-closed;
- accepted rule executes in SWI and returns provenance;
- existing claim/conflict tests remain green;
- candidate ontology can be discarded without mutating durable memory;
- the same candidate and query produce deterministic JSON output.

## Reflection loop

The rule-reduction and ontology-improvement stage is called **reflection**.
Reflection is an offline or threshold-triggered loop, not a hidden operation
inside an ordinary answer:

```text
current ontology -> inspect/reduce -> LLM proposes revision -> logical checks
-> counterexamples -> accept a new immutable ontology version or reject
```

Deterministic reduction runs first. The LLM may propose semantic
generalisation, merging or new rules across any declared domain, but
SWI-Prolog and the regression suite decide whether a proposal is admissible.

## Explicit non-goals

No automatic unrestricted Prolog code generation, no production-scale
learning of an ontology, and no CDR claim about usefulness in this CDD wave.
