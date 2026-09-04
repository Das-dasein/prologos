# Gamma specification: extraction annotation v1

Status: pre-registered CDR annotation contract for issue #5. It is not an
extraction result and does not establish model precision, recall, or utility.

## Annotation unit

One JSONL record represents one user turn. Its decision is exactly one of:

- `write`: one or more independent assertions explicitly supported by the
  turn; an empty write is `ignore`;
- `ignore`: no durable user assertion may be written;
- `clarify`: reference or scope is unresolved, so no assertion may be written.

Every `write` assertion is atomic: a conjunction with two independently
deniable propositions creates two records. Each assertion has predicate,
ordered arguments, polarity, modality, time, and source span. Unknown time is
explicit and is not an ongoing claim. `reported`, `questioned`, and `uncertain`
modality are annotation output but are not authorization to write a positive
durable fact.

## Error taxonomy

An evaluated extractor error must be placed in one or more of:

`decision`, `atomicity`, `polarity`, `predicate`, `argument`, `time`,
`modality`, `provenance`, `coreference`, `hallucination`.

`hallucination` is any proposed durable assertion unsupported by the annotated
turn. A negative statement is not a missing positive statement. An unresolved
pronoun is `coreference`, not a guessed entity. The taxonomy records observed
mistakes; it does not itself infer their cause.

## Structural oracle

The harness rejects unknown keys/classes, duplicate assertion IDs, invalid
atoms, illegal decision/assertion combinations, a missing source span,
non-explicit time, or an unsupported modality. It does not score natural
language similarity and does not call a model. A separate deterministic scorer
compares a structurally valid candidate annotation against the pinned gold
fixture and emits only pre-registered taxonomy labels. Seeded candidate errors
exercise `atomicity`, `polarity`, `time`, `decision`, `hallucination`, and
`coreference`, `predicate`, `argument`, `modality`, and `provenance`;
unsupported categories remain a future fixture requirement.

## Acceptance evidence

Positive fixture: one conjunction produces two facts and a direct negation
remains negative with its own source span. Negative fixtures: a hypothetical,
question, reported speech, and ambiguous reference contain no durable write.
The fixture and manifest are synthetic and contain no `data/memory.pl` data.
Its SHA-256 is pinned in the manifest, and the structural harness rejects known
private-data markers before scoring.
