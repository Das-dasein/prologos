# Free-Prolog diagnostic r2

Status: observed, not scored.  This was a prompt-only self-check intervention;
it is not a benchmark run and is not evidence of an accuracy change.

Model: `gpt-5.4-mini`.  The model wrote ordinary SWI-Prolog for the three
English cases after being asked to check body predicates and to represent XOR
in both directions.

| Case | Program/query behavior | Observation |
| --- | --- | --- |
| universal chain | `prepared(X) :- trains(X)`; native `forall/2` query | succeeded |
| exclusive choice | mutually recursive `writes/1` and `paints/1` through `\\+` | query failed |
| missing link | `ready(Person) :- calm(Person), prepared(Person)` without `prepared/1` | explicit `existence_error(procedure, prepared/1)` |

The self-check did not repair the two relevant failures.  In particular,
negation-as-failure is not classical negation and reciprocal NAF rules are not
a sound encoding of exclusive choice.  The missing predicate was still not
identified.  Do not iterate this prompt further as if it were a semantic
runtime.

The result motivates a callable runtime library for explicit finite-domain
semantics, while retaining ordinary Prolog as the agent-facing source.
