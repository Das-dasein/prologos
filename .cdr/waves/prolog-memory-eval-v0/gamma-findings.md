# Gamma findings and dispositions — prolog-memory-eval-v0

| Finding | Source | Disposition | State |
|---|---|---|---|
| Fixed-query oracle contains failing and non-diagnostic queries | independent beta R1 F1 | return to fresh alpha repair | open |
| PAM-C4 natural-language answer and provenance labels are incomplete | independent beta R1 F2 | return to fresh alpha repair | open |
| Harness, leakage sentinel, and budget sentinel are not executable | independent beta R1 F3 | split executable harness into CDS matter; CDR consumes pinned result | blocked on CDS |
| Baseline selection and run configuration are under-pinned | independent beta R1 F4 | return to fresh alpha repair | open |
| Source manifest described pre-Git state in present tense | independent beta R1 F5 | gamma corrected provenance wording | closed |
| First beta dispatch reused the alpha agent session | gamma process observation | marked review invalid and re-ran beta in a distinct agent | closed; evidence preserved |
| Delegated work initialized an empty `.git` repository and left `test-tmp/` | gamma process observation | disclose to operator; do not delete without approval | pending operator cleanup decision |

The canonical verdict is `.cdr/waves/prolog-memory-eval-v0/beta-review.md`:
`REVISE`. `beta-review.invalid-same-session.md` is retained only as evidence of
the role-isolation failure and has no verdict authority.
