# Free-Prolog diagnostic r1

Status: `observed, not scored, not pooled with M0/M1/M2`.

Transport: one `gpt-5.4-mini` Codex-subscription generation per case; ordinary
Prolog source and one query were requested. Each resulting source was executed
as an isolated untrusted thought with a 1.5-second limit. This r1 predates the
explicit outcome marker added to the runner immediately afterward, so the
three classifications below use its raw exit code and transcript only.

## Observations

### universal-chain — query succeeded

```prolog
person(ada).
person(ben).
trains(ada).
trains(ben).
prepared(X) :- trains(X).
prepared(ada).
counterexample(X) :- person(X), trains(X), \+ prepared(X).
all_trainers_prepared :- \+ counterexample(_).
```

Query: `all_trainers_prepared.` → exit `0`, no transcript error.

The agent wrote ordinary rules and a `counterexample/1` helper. It used
negation-as-failure for the universal claim. This is executable Prolog, but it
is not yet a validation that this encoding has the intended open-world or FOL
semantics.

### exclusive-choice — query failed

```prolog
paints(ada).
writes(ada) :- \+ paints(ada).
```

Query: `writes(ada).` → exit `1`, no transcript error.

The agent turned “either/or, but not both” into only one direction:
`writes → not paints`. It did not encode the converse or an XOR constraint.
This is a concrete semantic loss to inspect before deciding on a later helper
library or language contract.

### missing-link — runtime error

```prolog
calm(ada).
ready(X) :- calm(X), prepared(X).
```

Query: `ready(ada).` → process exit `0`, transcript:

```text
ERROR: call/1: Unknown procedure: prepared/1
```

The old runner caught the exception and therefore retained exit `0`; this is
why r1 was not assigned a synthetic success label. The runner now appends an
explicit `PAM_DIAGNOSTIC_OUTCOME: succeeded|failed|error(...)` marker to all
future diagnostic transcripts.

## Consequence

The free diagnostic did what it was meant to do: it revealed three different
agent behaviours—useful Horn-style execution, incomplete XOR formalization,
and an undefined intermediate predicate—without forcing a JSON AST or a
pre-designed micro-DSL. No performance claim follows from three cases.
