# Assertion lifecycle v1

**Status:** bounded implementation contract
**Related issue:** #13

An assertion is a proposition plus separately stored qualifiers. Its lifecycle
is an epistemic status, not a replacement for polarity, modality, time,
provenance or confidence.

## Statuses

`observed`, `extracted`, `hypothesized`, `accepted`, `conflicted`, `reviewed`,
`superseded`, `rejected`.

## Allowed transitions

```text
observed → extracted
extracted → hypothesized | accepted
hypothesized → accepted | rejected
accepted → conflicted | superseded
conflicted → reviewed | superseded
reviewed → accepted | rejected
```

The runtime may derive `superseded` from an append-only
`assertion_revision(New, replaces, Old)` record. A review is represented by an
append-only `assertion_status_event(Id, reviewed)` record.

## Safety boundary

An assertion may support a derived conclusion only when its effective status is
`accepted` and no unresolved conflict references it. A conflict remains
observable; consistency is not truth. Legacy assertions without an explicit
status use `accepted` as a migration default until reviewed.

LLM reflection may propose transitions. Socrates validates structure, IDs,
diagnostic support and transition legality. Applying a proposal requires
explicit approval and never deletes the source journal.
