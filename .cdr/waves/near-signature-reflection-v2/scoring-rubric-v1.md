# Scoring rubric v1

One finding is the unordered pair of candidate predicate signatures named by
the response plus its cited source IDs. Duplicate mentions of the same pair
count once. The primary unit is a response finding, not a final answer.

A finding is **source-supported** only when all hold: (1) both named
signatures occur in the frozen candidate; (2) cited `sN` exists in the frozen
source; (3) the cited English and evaluator-only `nl2fol` support that the
candidate used distinct spellings for the same asserted relation or used a
spelling that prevents the stated query relation from being represented.

A **false typo allegation** is a response judgement `same_relation` when the
source/evaluator FOL distinguishes the relations, or when its cited sentences
do not establish sameness. `different_relation` and `insufficient_basis` are
never false typo allegations.

Citation completeness is the share of response findings having at least one
valid, relevant `sN`; an empty response has completeness 1.0 and zero
findings. Responses that name no finding are abstentions. An invalid M0
candidate, unavailable certificate, invalid M1/M2 JSON, or failed call stays
in the denominator and is reported separately; it creates no inferred finding.

Morphology alone is not gold: `develop/develops` is source-supported only if
the frozen English plus `nl2fol` establish the same relation. Free-text
"other" observations are retained verbatim but excluded from primary counts.
