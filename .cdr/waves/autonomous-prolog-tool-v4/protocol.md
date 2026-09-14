# Autonomous Prolog tool v4 — frozen protocol

## Question

When a model receives the same final active signed-Horn snapshot, will it choose
to call a bounded Prolog checker, formulate the correct query, and use the
receipt accurately without being told to call the tool?

## Fixture

Sixteen cases are selected deterministically from the frozen v3 fixture. They
cross depth 7/8, chain/diamond topology and all four signed statuses; the
four-revision construction variant is used because v3 exposed more model-only
status failures there. Only the final active snapshot is shown. This is not a
temporal-projection or natural-language-extraction test.

## Conditions

| Condition | Prompt | Tool surface |
| --- | --- | --- |
| N | base prompt | no tools |
| A | byte-identical base prompt | `world_memory_query` available, optional |
| G | base plus explicit one-call instruction | `world_memory_query` available |

The tool accepts one ground query and runs the real checker over a freshly
seeded journal containing the fixture's active clauses. Every call gets a new
world. Only `world_memory_query` is exposed: proposal, dream, decision, file,
shell, web and built-in memory tools are absent.

Tool-enabled cells permit at most one local tool call and therefore at most two
physical model dispatches: initial response and one continuation. N permits one
dispatch. SDK/HTTP retries and fallback are disabled. Attempts, exact wire tool
schemas, tool arguments, results, final response, runtime identity and source
snapshots are retained. Existing attempt paths are never redispatched.

## Measures and interpretation

Primary A measures are tool-call rate, exact-query rate, valid-receipt rate,
status accuracy and exact support accuracy. G measures guided tool usability;
N is the no-tool behavioral baseline. Status and provenance are scored
separately.

- A over N is evidence for a system-level benefit only where A actually made a
  correct tool call and received a matching receipt.
- A below G indicates a tool-discovery/strategy-selection gap, not a solver
  failure.
- A correct receipt followed by a wrong answer is a receipt-use failure.
- G and A receipts expose checker-computed status and proof; success is not a
  claim that the model itself performed the multi-step proof.

This frozen synthetic experiment does not establish general Prolog advantage,
changed model cognition, production retrieval, extraction fidelity, clinical
utility or real-world action safety.
