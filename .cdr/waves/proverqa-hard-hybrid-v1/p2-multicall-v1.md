# P2-multicall v1 pre-registration scaffold

Status: `not collected; no live model call`.

This is a new condition, not a retry or repair of r3 one-call P2. Its purpose
is to let the model choose among distinct bounded Horn-chain subproblems while
it still handles quantifiers and non-Horn formula structure itself.

## Fixed proposal

- Budget: one to three broker actions per case.
- Catalog: at most three distinct opaque goal IDs, deterministically derived
  from the fixed Horn projection before collection; rule heads are ranked
  first, then facts fill any remaining slots. No source gold, arbitrary query,
  program, path, or command arguments enter selection.
- Surface: one sealed no-argument script per catalog goal. Every script must
  print its `BROKER_RESULT` to the model-visible native command output and
  write the identical private receipt.
- Trace gate: every action must name exactly one catalog script; each script
  may be used at most once; there must be 1..3 complete lifecycle pairs and
  no other tool/command action. A duplicate, foreign script, argument, or
  fourth call invalidates the record without retry.
- Scoring: P2-multicall has its own planned, protocol-valid, and correct
  denominators. It is never pooled with P2-one-call/r3.

The current broker exposes the deterministic `predeclaredGoals(caseId, 1..3)`
catalog primitive. A later collector/parser implementation must enforce the
above action contract before any live multicall collection is allowed.
