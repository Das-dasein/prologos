# Free-Prolog diagnostic r3: optional semantics library

Status: observed, not scored, incomplete diagnostic.  Model:
`gpt-5.4-mini`.  The isolated runtime preloaded an optional trusted predicate:
`finite_status(Domains, Axioms, Goal, MaxModels, Status, Certificate)`.
It evaluates finite `forall`, `exists`, `xor`, explicit `neg`, conjunction,
disjunction, and implication.  The agent still supplied ordinary Prolog and
chose whether to call it.

The executor was first checked directly with hand-authored calls:

| World | Expected finite status | Observed execution |
| --- | --- | --- |
| universal training rule | `entailed` | succeeded |
| Ada paints; exactly one of paints/writes | `contradicted` for `writes(ada)` | succeeded |
| Ada calm; no preparation fact/rule | `unknown` for `ready(ada)` | succeeded |

In a live XOR case the model elected to call the library and generated:

```prolog
world_domains([domain(person,[ada])]).
world_axioms([and(xor(atom(paints,[ada]), atom(writes,[ada])), atom(paints,[ada]))]).
hypothesis_goal(atom(writes,[ada])).
test(Status, Certificate) :- world_domains(Domains), world_axioms(Axioms),
    hypothesis_goal(Goal), finite_status(Domains, Axioms, Goal, 10, Status, Certificate).
```

The recorded bound query was
`test(contradicted, model_check(admissible_models(1), no_supporting_model))`.
This is the desired XOR semantics and does not depend on `\\+`.

The first live universal-chain attempt also exposed the remaining LLM-side
problem: it omitted the universal source rule and wrote a console query with
`?-`, which the execution API correctly rejected.  The prompt now explicitly
requires a bare callable query.  This is not repaired by the library: the
library can execute a selected formalization, not guarantee faithful English
extraction.  The next diagnostic must therefore measure formalization
faithfulness separately from runtime execution.
