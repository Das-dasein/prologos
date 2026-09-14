# Autonomous Prolog tool v4: terminal two-case pilot

This is a verified terminal pilot, not the planned 16-case wave. Report
SHA-256: `8c36fb4ec4bc4406d3d4b30101e5dc752f4d031eca4209ca03604aeae8a137ff`.

## Result

| Condition | Runtime-valid | Autonomous/protocol tool calls | Status correct | Exact answer |
| --- | ---: | ---: | ---: | ---: |
| N: no tool | 2/2 | 0/2 | 1/2 | 0/2 |
| A: optional tool | 0/2 | 0/2 executed | not scored | not scored |
| G: exactly one guided call | 2/2 | 2/2 | 2/2 | 1/2 |

Both A responses independently selected `world_memory_query`, but each emitted
two parallel calls: one for the supplied query and one for its explicit
negation. The frozen protocol allowed at most one call because the checker
already returns four-way status. The adapter therefore stopped before executing
either call. These are protocol violations, not solver failures and not
evidence that the model declined to use Prolog.

Both G cells called the correct query once, received a checker receipt whose
status and target support sets matched the oracle, and returned the correct
status and support membership. One conflict answer moved one ID out of
lexicographic order, so it failed the frozen canonical exact-answer criterion.
This is a receipt-use/serialization error after a correct solver result.

N got one of two statuses correct and neither exact provenance answer correct.
The sample is deliberately too small for a comparative effect claim.

## Decision

Do not spend the full 48-cell v4 budget. The pilot falsified the one-call
interface assumption for unguided use. A successor protocol should permit up
to two calls emitted in the first turn, execute them both, count redundant or
complementary calls explicitly, and retain G as a one-call usability control.
That tests the user's proposed policy—make Prolog available and let the model
decide—without converting a natural two-query strategy into an infrastructure
failure.

Boundaries: this is a synthetic signed-Horn tool-selection pilot. It does not
establish a general Prolog advantage, changed cognition, extraction fidelity,
or real-world agent reliability.
