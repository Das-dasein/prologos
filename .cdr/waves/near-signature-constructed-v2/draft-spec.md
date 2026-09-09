# Near-signature constructed v2 — draft, not for model execution

## Question this experiment is allowed to answer

Does a read-only Prolog `near_signature_audit` help Luna identify a query/world
naming pair and judge its semantic relationship using the English premises and
question?

It does **not** test automatic repair, entailment accuracy, natural frequency of
translation errors, or whether the model should change a Prolog candidate.

## Invariant shared by every item

Each item has two English facts, two immutable reified unary facts, one
natural-language question, and one immutable formal query. The response may only
classify the audited naming pair as `same_relation`, `different_relation`, or
`insufficient_basis`; it cannot repair the candidate.

The English question is the semantic anchor for the intended query relation. In
**every** item the query predicate is absent
from the facts, so the standard Prolog result is `unknown`. Each item has exactly
one query/world near pair and no world-internal near pair. Prolog status is shown
in the dashboard but is not a score.

## Draft cases

| ID | English source | English question | Frozen facts | Frozen query | evaluator-only verdict |
|---|---|---|---|---|---|
| real-1 | s1 Ada receives accolades. s2 Ada reads papers. | Does Ada receive accolades? | `receives_accolades`, `reads_papers` | `receive_accolades` | `same_relation` |
| real-2 | s1 Ada enjoys hiking. s2 Ada reads papers. | Does Ada enjoy hiking? | `enjoys_hiking`, `reads_papers` | `enjoy_hiking` | `same_relation` |
| real-3 | s1 Ada develops plans. s2 Ada reads papers. | Does Ada develop plans? | `develops_plans`, `reads_papers` | `develop_plans` | `same_relation` |
| real-4 | s1 Ada plans trips. s2 Ada reads papers. | Does Ada plan trips? | `plans_trips`, `reads_papers` | `plan_trips` | `same_relation` |
| control-1 | s1 Ada cares for patients. s2 Ada reads papers. | Does Ada cure patients? | `cares`, `reads_papers` | `cures` | `different_relation` |
| control-2 | s1 Ada walks to work. s2 Ada reads papers. | Does Ada talk to colleagues? | `walks`, `reads_papers` | `talks` | `different_relation` |
| control-3 | s1 Ada sees stars. s2 Ada reads papers. | Does Ada seek answers? | `sees`, `reads_papers` | `seeks` | `different_relation` |
| control-4 | s1 Ada reads novels. s2 Ada studies mathematics. | Does Ada lead teams? | `reads`, `studies_mathematics` | `leads` | `different_relation` |

Each pair above is one edit apart. In `real-*`, the question and source name the
same relation despite the formal singular/plural mismatch. In `control-*`, the
question names a relation absent from the source while the closest world predicate
names a distinct relation. The model-visible fixture must use opaque case IDs so
`real` and `control` never enter a prompt.

## Pre-registered scoring

Primary metrics are reported separately, never collapsed into a total accuracy:

1. **Target-pair mention:** fraction of each stratum where the model identifies
   the evaluator target query/world pair in its free audit. This is descriptive,
   not an accuracy score.
2. **Real confirmation:** fraction of `real-*` where the target pair is named
   and classified `same_relation` with the cited source sentence.
3. **Control false merge:** fraction of `control-*` where the target pair is
   classified `same_relation`. Lower is better.
4. **Explicit correct distinction:** fraction of `control-*` where the target pair is named
   and classified `different_relation` with the cited source sentence.
5. **Abstention:** fraction of each stratum classified `insufficient_basis` for
   the target pair.
6. **No target judgement:** output that does not classify the target pair.
7. **Irrelevant or contradictory output:** a wrong pair, multiple incompatible
   classifications for the target pair, or source IDs outside the item.

The audit is free-form: neither branch is given an evaluator target pair. M1 has
only source, question, immutable candidate and standard Prolog certificate.
M2 receives byte-identical text plus exactly the read-only `near_signature_audit`
certificate. The run has 16 calls (8 M1/M2 pairs), no M0, retries, aliases, or
repairs. Every item must execute in Prolog before the raw directory is created.

## Mandatory review before freeze

An independent methodological reviewer must explicitly answer all of these before
this draft may become a fixture:

1. Does each English question unambiguously anchor the relation whose intended
   formalization evaluator gold attributes to the query?
2. Do all cases have the same two-fact/absent-query/`unknown` Prolog structure,
   one query/world near pair, and no world-internal near pair?
3. Are the primary metrics measuring semantic classification rather than mere
   explicit mention of an audit pair?
4. Are there any accidental lexical or structural shortcuts separating labels?
5. Do the prompt, scorer, and dashboard keep pair mention, verdict, abstention,
   invalid citation, and irrelevant output as distinct outcomes?

## Citation and scope boundary

The automatic scorer checks whether a response names the target pair, assigns its
pre-registered verdict, and cites source ID `s1`. It does not prove the semantic
quality of the prose explanation; that remains visible in the dashboard for human
review. The limited set has four compound inflection pairs in `real-*` and four
short lexical pairs in `control-*`; results are descriptive for these cases only,
not a general claim about resolving similar predicate names.
