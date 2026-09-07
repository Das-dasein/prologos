# One ProverQA hard sample: surface semantics API

Status: one observed diagnostic; not a benchmark score.  Source: ProverQA
`dev/hard`, id `241`, drawn with the fixed label
`llm-metaprolog-sample-v1` (index 241 of 500).  The downloaded source SHA-256
matched the pinned manifest.  The model received only `context` and `question`;
the source answer, reasoning, `nl2fol`, and `conclusion_fol` were withheld.

The model was given the normal-Prolog surface API:

```prolog
domain(person, [...]).
axiom(fact(...)).
axiom(rule([BodyLiteral], HeadFormula)).
semantic_status(Goal, Status, Certificate).
```

It used that interface correctly for `creative(michelle)`.  The isolated
runtime recorded:

```text
semantic_status(creative(michelle), budget_exhausted,
  budget(candidate_models(2305843009213693952), maximum(256)))
```

Thus the new surface contract removed the prior API-shape failure: no invented
`finite_status/6` arguments and no undefined predicate.  It did **not** answer
the task, because the current evaluator enumerates all propositional models of
the supplied vocabulary; the model's relevant fragment still induced 61
atoms, hence `2^61` candidate models.  `budget_exhausted` is the intended
honest result under the fixed limit, not an answer class.

The next runtime improvement is relevance slicing or symbolic/forward proof
search with explicit countermodel handling.  It is a runtime scalability task,
separate from text-to-Prolog faithfulness and from benchmark correctness.

## Follow-up: runtime relevance slice

`semantic_slice_status/3` now computes a predicate-dependency component itself
and, only for monadic worlds, narrows the finite domain to the constants in
that component.  On a fresh one-call generation for the same held-out model
input, the model used the new API correctly and the runtime returned:

```text
semantic_slice_status(creative(michelle), unknown,
  sliced(total_axioms(22), kept_axioms(0),
    open_pair(true_model([holds(creative,[michelle])]), false_model([]))))
```

This avoids the prior model-enumeration explosion, but it is not a correct
answer to the benchmark case.  Inspection of the model-authored program found
that it omitted the English rule whose antecedent is `creative(michelle)` and
whose XOR consequence is required for the source's false conclusion.  With no
axiom mentioning `creative`, the deterministic slicer correctly retained zero
axioms and reported `unknown`.  This separates two failures: runtime scaling
is improved, while text-to-Prolog faithfulness remains independently auditable.
