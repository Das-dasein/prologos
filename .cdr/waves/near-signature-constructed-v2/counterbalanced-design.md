# V2 replacement: matched semantic twins — not yet frozen

This replaces the earlier V2 draft before any model call. Each formal twin has
identical English source facts, program, formal query, Prolog status, and
near-signature certificate. Only the natural-language question changes.

| twin | shared source/program/query near pair | same-relation question | different-relation question |
|---|---|---|---|
| A | `holds_papers` / `folds_papers`; source: Ada holds papers. | Does Ada hold papers? | Does Ada fold papers? |
| B | `wears_coats` / `tears_coats`; source: Ada wears coats. | Does Ada wear coats? | Does Ada tear coats? |
| C | `prints_labels` / `paints_labels`; source: Ada prints labels. | Does Ada print labels? | Does Ada paint labels? |
| D | `sells_jars` / `seals_jars`; source: Ada sells jars. | Does Ada sell jars? | Does Ada seal jars? |

Every item also has `s2: Ada studies mathematics.` The program contains the
source predicate and `studies_mathematics`; its frozen query is the second name
in the pair. Thus every query is absent and Prolog returns `unknown`.

The same-question item expects `same_relation`: the question establishes the
meaning of the source predicate, while the frozen query differs by one letter.
The different-question item expects `different_relation`: the question establishes
the meaning of the frozen query, which differs from the source predicate. This is
a free audit: target-pair mention, verdict, abstention, and silence remain
separate outcomes.

Because each exact predicate pair appears once under each verdict, no model can
predict the class from edit operation, length, source program, query, or Prolog
certificate alone. The only changing model-visible evidence is the English
question. This still tests eight constructed examples, not natural error rate or
automatic repair.
