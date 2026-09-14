# Prolog receipt transport v6 — frozen protocol

## Question

Does a deterministic target-scoped Prolog receipt reduce downstream provenance
errors compared with the current verbose raw checker receipt?

## Motivation

In the terminal v5 wave, all 25 executed primary checker receipts matched the
oracle and final status remained correct in 25/25, but exact provenance
survived in only 19/25. Inspection found that the model sometimes selected an
intermediate literal's support set, added an unrelated ID, or omitted IDs while
copying the large `raw_support_sets` payload.

## Conditions

Each of the same 16 frozen v5 formal cases appears in both conditions. R/C
order alternates by case. The system prompt, user prompt, tool schema, exact
query, solver, seeded journal, model settings, and two-dispatch budget are
identical.

| Condition | Delivered local tool result |
| --- | --- |
| R | Existing complete JSON returned by `world_memory_query` |
| C | Deterministic `target-support-v1` projection |

The C projection contains only `receipt_schema`, `query`, `status`,
`positive_support_sets`, and `negative_support_sets`. It is computed locally
from the exact raw result by filtering support entries for `q` and `neg(q)`,
then sorting IDs and outer support lists. The raw result and its SHA-256 remain
in evidence for both conditions. The projection does not invoke another model,
change the solver, add facts, or compute a different proof.

The model must call `world_memory_query` exactly once with the supplied query.
Each cell permits exactly two physical dispatches: tool selection and one
continuation after the local result. SDK/HTTP retries and fallback are disabled.

## Measures and interpretation

Raw receipt correctness and delivered receipt correctness are checked before
scoring the final response. Primary outcomes are final support membership and
canonical exact answer; status is retained separately. Exact paired McNemar
comparisons use the 16 case pairs.

C over R is evidence for a receipt-transport/interface benefit, not a solver
benefit: both conditions execute the same checker. Even a clean result remains
specific to one model, one synthetic fixture, and deterministic formal input.
It does not establish natural-language translation fidelity, general Prolog
utility, production retrieval, or real-world agent safety.
