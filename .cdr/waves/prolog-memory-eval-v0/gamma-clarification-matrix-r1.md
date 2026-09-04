# Gamma clarification R1: evaluation-matrix oracle contract

Issue: GitHub #20. This is a contract repair after CDR beta R1; it changes no
threshold, baseline rule, provider, or result claim.

## Dataset and category authority

Matrix A is computed from the pinned
`.cdr/datasets/dialogues-pilot-v1.jsonl`, not from the separate nine-record
`extraction-annotation-pilot-v1.jsonl` structural fixture. Every dialogue
record has exactly one `category`; the six registered categories each contain
exactly two records. A scorer must reject a missing, unknown, duplicate, or
miscounted category and must report the dataset SHA-256. The extraction
annotation fixture remains the structural oracle for issue #5 and is not
silently treated as the Matrix A dataset.

## v1 annotation to v2/profile mapping

For issue #5, an annotation-v1 `write` assertion maps to one v2 extraction
proposal: `predicate` -> v2 `relation`, ordered `arguments` -> v2
`arguments`, `polarity` -> `polarity`, `time.kind=interval` dates ->
`valid_from`/`valid_to`, and `time.kind=unknown` -> both fields `null`.
`modality=asserted` is required for a durable write; other modalities are
non-write or clarification evidence. `source_span` is retained as provenance
and must resolve to the source turn. The active profile identity and relation
arity are checked before comparison; unknown relations are rejected or routed
as candidates, never silently accepted. `scope` and `qualifier` are explicit
taxonomy labels for applicable cases (including `N/A` when absent), distinct
from `time`.

## Matrix A cell definitions

The unit is a turn unless stated otherwise. For a category `k`, `N_k` is the
number of dialogue turns in that category (24 total); `W_k` is gold write
turns; `A_k` is gold assertions; `D_k` is non-ambiguous durable turns; and
`Q_k` is answerable oracle queries. Each rate reports numerator/denominator;
an inapplicable cell is `N/A`, never zero.

- Decision: correctly predicted decision / `N_k`.
- Assertion exact match: turns whose complete assertion set matches gold / `W_k`.
- Write P/R: exact predicted write operations / predicted writes (P) and / `A_k` (R).
- Predicate, arguments, polarity, time, modality, provenance, scope, qualifier:
  correct applicable fields / applicable gold fields; absent fields are `N/A`.
- Hallucination: unsupported predicted durable assertions / all predicted durable assertions.
- False clarification: durable non-ambiguous turns incorrectly clarified / `D_k`.

## Matrix B cell definitions

All conditions use the same 12 dialogues, model, prompt, sampling and context
budget. B5 is the gold-claims oracle ceiling. Write P/R uses the operation
definition above; active-state accuracy is correct active-claim sets / `Q_k`;
conflict accuracy is correct conflict status and members / conflict cases;
provenance completeness is complete required provenance / written claims;
false clarification uses `D_k`; stale/contradictory error is incorrect answer
on cases with temporal or conflict-sensitive gold state. Empty denominators are
reported as `N/A` with the count, never suppressed.

These rules make the matrices reproducible and auditable; they do not establish
live-model quality until a separately pinned run produces raw outputs and a
CDR receipt.
