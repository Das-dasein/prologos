# Luna extraction repair v1

Status: preliminary completed run; superseded for provenance by v2.

This run produced the same 7/8 aggregate as v2 but did not snapshot its
executable sources at run start. Use the sibling `luna-extraction-repair-v2`
result for the verified research record.

The original one-pass extraction scored 16/24 exact and contained 16 invalid
program strings across eight cases. Each failed case received one additional
Luna call containing its original candidate set and deterministic signed-Horn
parser diagnostics. No gold candidate or admission decision was supplied.

| Surface | Result |
| --- | ---: |
| First-pass exact | 16/24 |
| Failed cases repaired exactly | 7/8 |
| Combined exact after one repair | 23/24 |
| Invalid programs before repair | 16 |
| Invalid programs after repair | 0 |
| Runtime failures | 0/8 |

All eight calls preserved candidate count, order, IDs and every non-program
field. Seven cases became exact. This demonstrates that the observed `->` and
`&` grammar failures were highly recoverable when the model received explicit
validator feedback.

`p05_b` remained non-exact despite all three programs becoming syntactically
and semantically shaped like the gold clauses. Its first pass had assigned
`validTo: 19` to the old rule, while the authored contract keeps `validTo: null`
and represents retirement only through the new candidate's `replaces` link.
The repair contract deliberately prohibited changing non-program fields, so the
old candidate could not match and the generated replacement link could not map
to the gold ID. This is a temporal/replacement extraction error, not a grammar
or checker failure.

The result measures assisted second-pass recoverability. It does not change the
historical 16/24 first-pass score, establish spontaneous extraction quality, or
test admission, behavior, long-term memory utility, answer-time solver benefit
or dreams. A production design may use validator feedback while retaining both
attempts and still require semantic review before admission.

Raw request and adapter evidence is retained in this directory. The strict
source-snapshot verifier targets v2, whose run-start evidence closes the missing
provenance boundary.
