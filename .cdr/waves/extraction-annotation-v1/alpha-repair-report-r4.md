# Alpha repair report R4: canonical polarity counterexample

The pizza dialogue was converted into a synthetic CDR case. The oracle records
two independent assertions over the same canonical proposition: positive
`likes(user,pizza)` for “love pizza” and negative `likes(user,pizza)` for
“cannot stand it anymore”. A seeded `dislikes(user,pizza)` output is scored as
both predicate and polarity error.

This changes neither chat runtime nor the shared ontology. It adds a bounded
counterexample to the extraction annotation contract; a future model run may
be evaluated against it only after the CDR gate is opened.
