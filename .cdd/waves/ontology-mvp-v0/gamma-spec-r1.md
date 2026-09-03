# Gamma specification R1: universal semantic representation

Status: bounded CDD contract for extraction and ontology candidates. This
document supersedes no implementation, CDR method, dataset, oracle, or
threshold. It is an engineering specification and is not evidence of
ontology quality or product utility.

## Purpose and semantic boundary

The dialogue extractor must represent what the dialogue says before any
ontology rule is applied. The representation is domain-neutral: employment,
education, projects, and technologies are examples of declared vocabulary,
not special semantics built into the harness.

The following meanings are intentionally independent:

* `postgraduate_program_completed(Person, Program)` — the person is stated to
  have completed the program;
* `dissertation_note_written(Person, Work)` — the person is stated to have
  written a note, draft, report, or other specified dissertation-related work;
* `degree_awarded(Person, Degree)` — an awarding authority is stated to have
  conferred the degree.

Completion of a postgraduate program does **not** entail writing a
dissertation note, and neither completion nor writing a note entails that a
degree was awarded. A degree may be recorded only when the dialogue or an
accepted source explicitly supports an award (or when a separately approved
rule states an institution-specific equivalence). “Candidate”, “defended”,
“submitted”, “completed”, “graduated”, and “degree awarded” are not synonyms.

## Universal semantic record

Extraction produces a versioned JSON document. The LLM may propose records;
the deterministic validator decides whether they can enter the candidate
ontology.

```json
{
  "schema_version": "semantic-dialogue-v1",
  "entities": [
    {"id":"person_1", "type":"person"},
    {"id":"program_1", "type":"postgraduate_program"}
  ],
  "assertions": [
    {
      "id":"a_1",
      "predicate":"postgraduate_program_completed",
      "arguments":["person_1","program_1"],
      "polarity":"positive",
      "modality":"asserted",
      "time":{"kind":"unknown"},
      "source":{"kind":"dialogue","turn":"t3","span":"..."}
    }
  ]
}
```

The universal record has these semantics:

* `entities` assigns stable, local identifiers and a declared type. An
  identifier is not a name and must not be merged with another entity merely
  because labels look similar.
* An `assertion` is a typed proposition: predicate plus ordered arguments.
  Predicate names and arities come from the versioned registry. Arguments are
  entity/value identifiers, never executable text.
* `polarity` is `positive` or `negative`; `modality` is `asserted`,
  `reported`, `questioned`, or `uncertain`. Only `asserted`/`reported`
  propositions with sufficient support may be projected into the current
  positive-fact proposal. Questions and uncertainty remain extraction output,
  not facts.
* `time.kind` is `unknown`, `point`, `interval`, or `ongoing`. Unknown time is
  different from “currently true”; a missing date must not be invented.
* `source` records the dialogue turn/span or an explicitly supplied source.
  Unsupported provenance is rejected or marked unresolved, never fabricated.

The minimum representation is still valid when time, source detail, or an
optional label is unavailable: use the explicit `unknown`/unresolved value.
Required semantic information may not be smuggled into a free-text predicate,
argument, or comment.

## Extraction acceptance cases

An extraction is accepted only if it preserves the distinction and does not
upgrade the speaker's claim. The following cases are pre-registered:

| Dialogue meaning | Accepted semantic output | Forbidden output |
|---|---|---|
| “I completed the postgraduate programme.” | `postgraduate_program_completed(P,Program)`, positive, asserted/reported | `degree_awarded(P,Degree)` |
| “I wrote a note about my dissertation.” | `dissertation_note_written(P,Work)`, positive | `degree_awarded(P,Degree)` or `dissertation_defended(P)` |
| “The university awarded me a PhD.” | `degree_awarded(P,PhD)`, positive, with awarding authority if stated | inferring program completion when not stated |
| “I submitted/defended my dissertation.” | a submission/defense assertion only, with its stated status | treating it as an award |
| “I finished the program but have not received the degree.” | completion positive plus degree-award negative/uncertain as explicitly stated | collapsing the two into one status |
| “Did you complete the program?” | a questioned assertion, not a positive fact | recording completion as true |
| “I may have completed it” / ambiguous reference | uncertain or unresolved assertion | choosing a person, program, date, or degree by guess |

Core acceptance tests must also cover explicit negation, past versus ongoing
time, anaphora (“that program”), and two similarly named works. If the text
does not identify the program, work, degree, or awarding authority well enough
to construct a stable argument, retain the unresolved extraction record and
do not project a fact.

## Projection into the bounded ontology

Projection from semantic records to the existing `ontology-proposal-v0` is a
loss-aware boundary. It may emit only registered positive base facts whose
arguments are validated atoms. Polarity, modality, temporal qualifiers, and
provenance must not silently disappear: if v0 cannot represent one of them,
the record remains unresolved and is excluded from the candidate fact set.
The projection must preserve `candidate_version` and produce deterministic,
path-free rejection records. This R1 contract does not authorize edits to
`memory.pl`, `data/memory.pl`, or the CDR artifacts.

## Bounded rule constraints

Rules are optional, explicit, and monotonic. A rule may derive a new
domain-declared predicate only from positive registered predicates; it may not
rewrite, negate, delete, or qualify a source assertion. Every head variable
must occur in an earlier body goal, every body variable must already be bound
left-to-right, dependencies must be acyclic, and a candidate must obey the
v0 limits: at most 4 body goals, 6 variables per rule, 50 rules, 100 facts,
and 4096 bytes of compiled source.

In particular, the following rule is prohibited unless an explicit future
contract and an awarding-authority premise are added:

```prolog
degree_awarded(P, D) :- postgraduate_program_completed(P, Program).
```

The safe default is no implication between the three postgraduate predicates.
An institution-specific rule, if ever admitted, must include a registered
authority/credential premise, declare its scope and version, and still cannot
convert uncertain, questioned, negative, or unresolved extraction output into
a positive fact. Rule support is returned separately from source claims and
must be sorted and reproducible.

## Acceptance gate for R1

Alpha is acceptable when deterministic fixtures pass the table above,
including a paired record where completion is true and degree award is
unknown or false; the result must retain completion while returning no degree
fact. Fixtures must also show that a note, submission, or defense does not
produce an award. Existing validator, isolation, timeout, immutable-runtime,
and `npm test` requirements remain in force. Any broader semantic vocabulary,
negative-fact projection, temporal inference, or authority equivalence requires
a new contract version and a fresh beta review.
