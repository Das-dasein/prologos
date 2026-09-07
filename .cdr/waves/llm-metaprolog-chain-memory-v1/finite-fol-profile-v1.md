# Finite FOL execution profile v1

Status: `candidate profile; free-Prolog diagnostic and source-semantic audit pending`.

This is the object logic executed by meta-Prolog in M2. It is deliberately
finite, typed, and bounded. It must not be represented as a claim about
unbounded real-world first-order logic.

## Syntax

```text
F ::= atom(name, args)
    | neg(F)
    | and(F, F) | or(F, F) | xor(F, F) | implies(F, F)
    | forall({name, type}, F) | exists({name, type}, F)
```

The external syntax is restricted Prolog: `all(Type, Name, Formula)` and
`some(Type, Name, Formula)` denote quantifiers, while a lower-case `Name` in
an atom denotes that bound variable. The parser converts it to the internal
formula representation before evaluation. Atoms have fixed predicate arity;
every declaration has English source-span references.

## Domain and models

For one case, `domain[type]` is the complete domain of that type. Quantifiers
range only over this list. The evaluator grounds quantifiers and reduces the
result to a finite propositional theory. A model assigns a truth value to each
ground atom mentioned by the accepted plan.

An explicit `neg(atom(...))` is a logical negation in this object language;
it is not Prolog `\\+` and is not inferred merely because the positive atom is
absent.

## Operator profile

The initial profile is ordinary two-valued finite-model semantics after
grounding:

- `neg`, `and`, `or`, `xor`, and `implies` use their standard truth tables;
- `forall` is conjunction over the typed domain;
- `exists` is disjunction over the typed domain;
- a model is admissible only when every selected axiom evaluates `true`.

For a goal `G`:

- `entailed`: every admissible model satisfies `G`;
- `contradicted`: every admissible model satisfies `neg(G)`;
- `unknown`: at least one admissible model satisfies `G` and at least one
  admissible model satisfies `neg(G)`;
- `conflict`: no admissible model exists, or both entailment checks succeed;
- `budget_exhausted`: the bounded model search cannot decide the above.

This profile is a protocol choice, not an assertion that it matches ProverQA
gold. Before live collection, a compiler-preflight must execute source
`nl2fol` under this profile on an independent diagnostic sample and compare it
with source labels. A mismatch blocks collection or creates a separately
versioned semantic profile; it is never silently patched per case.

## Certificates

`entailed` carries a finite grounding/derivation certificate. `contradicted`
carries the same certificate for `neg(G)`. `unknown` carries two admissible
valuations, one satisfying `G` and one satisfying `neg(G)`. `conflict` carries
the unsatisfiable axiom core found within budget. Certificates cite only AST
form ids and ground atoms from the agent plan.

## Runtime boundary

Meta-Prolog is allowed to implement grounding, simplification, bounded model
enumeration, and certificate construction. It is not allowed to call an LLM,
read a benchmark sidecar, expand a domain beyond the plan, or turn an absent
atom into `neg(atom)`.
