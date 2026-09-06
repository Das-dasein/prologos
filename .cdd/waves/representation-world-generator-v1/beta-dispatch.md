# β dispatch: representation-world-generator-v1

You are β for the bounded CDD implementation cycle. Use a fresh session that
is distinct from α. Do not rely on α's rationale; inspect the committed
artifacts and rerun checks independently.

## Read first

1. `.cdd/waves/representation-world-generator-v1/gamma-spec.md`
2. `.cdr/waves/representation-formalization-v1/manifest.md`
3. The submitted α diff and test commands.

## Review oracle

Reject if any acceptance criterion is unmet. In particular, independently
verify that P1 prompt assembly cannot receive a Prolog proof/result, expected
label, or callable solver; that both conditions share the same question and
output contract; that the 24 strata are complete; and that the local Prolog
oracle recomputes every generated label.

Run the focused tests and `npm test` from clean state. Return APPROVE or
REQUEST CHANGES with file/line evidence. Do not issue a CDR result claim.
