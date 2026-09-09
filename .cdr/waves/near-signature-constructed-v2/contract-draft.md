# V2 prompt and scorer contract — draft, not for model calls

## Model-visible source notation

The English facts retain IDs `s1`, `s2`. The natural-language question is
presented as `q1`. The model receives a frozen candidate and must not repair it.

It may report zero or more free-audit findings. Each finding is:

```json
{"left":"predicate/1","right":"predicate/1","evidence_ids":["s1","q1"],"judgement":"same_relation|different_relation|insufficient_basis","explanation":"..."}
```

`evidence_ids` permits only `s1`, `s2`, `q1` and is not a proof that the prose
explanation is correct.

## Required prompt meaning

The frozen query is a proposed formalization of `q1`, and may be wrong.

- `same_relation`: in the English source and `q1`, the query should refer to the
  same relation as the cited source predicate; a spelling difference in the
  frozen candidate breaks that correspondence. It does **not** assert that the
  two Prolog symbols are equal or that English words are synonyms.
- `different_relation`: `q1` genuinely asks about a different relation from the
  cited source predicate; close spelling is not grounds to merge them.
- `insufficient_basis`: source plus question do not settle that relationship.

M1 sees this contract, source, `q1`, frozen candidate, and standard certificate.
M2 sees byte-identical text plus the read-only near-signature certificate. Neither
sees family, gold, or an evaluator target pair.

## Deterministic scorer

For each evaluator target, compare exact unordered `predicate/1` pairs only.
Do not stem, normalize, accept one matching name, or select a convenient finding.

Record independently:

1. target pair mentioned;
2. target verdict (`same_relation`, `different_relation`, or `insufficient_basis`);
3. `same_relation` on a control target, always a false merge even if its evidence
   IDs are invalid or another finding contradicts it;
4. required evidence present: `s1` and `q1` for a positive target judgement;
5. absent target judgement; invalid IDs; conflicting verdicts; and other pairs.

For each family, record whether both twins give their gold verdict with required
evidence. The report has per-condition denominators of four and a family denominator
of four; it never presents eight cases as independent or a single accuracy number.
