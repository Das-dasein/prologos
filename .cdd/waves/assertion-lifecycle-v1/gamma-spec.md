# Gamma specification: assertion lifecycle and reflection boundary

**Status:** bounded contract for alpha implementation and beta review
**Wave:** `assertion-lifecycle-v1`

## Purpose

Define the boundary between an append-only assertion journal, deterministic
diagnostics, a language-agent reflection proposal and controlled application.

## Canonical assertion

The proposition and its qualifiers are separate facts:

```prolog
assertion(Id, Proposition).
assertion_polarity(Id, positive_or_negative).
assertion_modality(Id, asserted_or_reported_or_questioned_or_uncertain).
assertion_time(Id, unknown_or_interval(From, To)).
assertion_source(Id, Source).
assertion_confidence(Id, Confidence).
```

Lifecycle status is separate from proposition semantics. A legacy assertion
without an explicit status uses `accepted` as a migration default.

## Lifecycle

Allowed transitions are:

```text
observed → extracted
extracted → hypothesized | accepted
hypothesized → accepted | rejected
accepted → conflicted | superseded
conflicted → reviewed | superseded
reviewed → accepted | rejected
```

`superseded` may be derived from
`assertion_revision(New, replaces, Old)`. The source assertion remains in the
journal.

## Reflection protocol

Diagnostics are read-only. The language agent receives diagnostics and returns
only `reflection-proposal-v1` actions:

- `mark_duplicate`;
- `propose_alias`;
- `propose_revision`;
- `review`.

Socrates must reject unknown assertion IDs, self-revisions, unsupported
duplicates and malformed actions. A proposal is not a fact and `accepted` at
this stage means accepted for application review, not true.

## Application boundary

No write occurs without explicit approval. Approved writes are append-only:
revision records or status events. Aliases and unresolved review decisions are
deferred. `safe_assertion/2` requires effective status `accepted` and rejects
assertions involved in unresolved conflicts.

## Acceptance gate

- deterministic transition and safety tests pass;
- proposal schema and Socrates checks pass;
- source journal is preserved during application;
- full regression and CDR gold tests remain green;
- alpha and beta reports record evidence and limitations.

This contract makes no claim about truth, consciousness, general LLM quality or
the usefulness of reflection proposals outside the bounded test slice.
