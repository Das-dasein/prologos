# Autonomous Prolog tool v5 — frozen protocol

## Question

When a model receives the same final active signed-Horn snapshot, will it choose
to use the bounded Prolog checker, formulate useful queries, and use the
receipts accurately when no instruction requires a tool call?

## Why v5 exists

The terminal two-case v4 pilot showed that the optional-tool model selected
`world_memory_query` in both cases but naturally emitted two parallel calls:
one for `q` and one for `neg(q)`. V4 allowed only one call and therefore stopped
before execution. V5 preserves the prompts, tool schema, model-facing snapshot,
solver, cases, oracle and scorers, while allowing that observed autonomous
strategy to execute.

## Conditions

| Condition | Prompt | Tool surface and first-turn allowance |
| --- | --- | --- |
| N | base prompt | no tools |
| A | byte-identical base prompt | optional `world_memory_query`; zero, one, or two calls |
| G | base plus explicit exactly-once instruction | the same tool; zero or one call |

All calls must occur in the first model turn. If calls occur, every result is
returned together and exactly one continuation is allowed. Thus tool-enabled
cells still permit at most two physical model dispatches, regardless of whether
the first response contains one or two parallel calls. N permits one dispatch.
SDK/HTTP retries and fallback remain disabled.

## Measures

The report separately records:

- whether the tool was selected;
- the number of calls;
- whether the primary query `q` was called;
- whether the complementary query `neg(q)` was called;
- whether a second complementary call was redundant, since one checker receipt
  already contains four-way status and both polarities' proof provenance;
- correctness of the primary receipt;
- final status, exact support membership, and canonical exact answer.

The G condition remains a one-call usability control. A below G after valid
receipts is a tool-strategy or receipt-use problem, not a solver failure.

## Boundaries

This is a frozen synthetic signed-Horn system evaluation. It can show whether
this model and harness gain from optional access to this checker. It cannot
establish general Prolog advantage, changed model cognition, extraction
fidelity, production retrieval, clinical utility, or real-world agent safety.
