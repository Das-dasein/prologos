# Explicit assertion dependency invalidation v1

Date: 2026-09-13. Status: implemented bounded contract.

## Problem

`lineage_id` groups source events by a recorded common origin for support
counting. It does not identify which accepted assertion was copied or transformed
into another assertion. Invalidating every item in one lineage would therefore
remove unrelated claims from the same source, while invalidating only the
replaced item can leave a known stale copy active.

## Contract

An item may declare `dependsOn`, a list of up to 16 distinct IDs of previously
admitted items. The dependency is explicit, immutable and journaled with the
candidate and admission. It is accepted only when every named item already
exists, which prevents cycles in this first version.

At a requested snapshot time, an asserted item is active only when:

1. its observation, admission and validity interval make it active;
2. it has not been replaced by an effective admitted item;
3. every item in its transitive `dependsOn` closure is also active.

The projection removes dependent items to a fixed point. Reloading the journal
reconstructs the same snapshot. A stale copy arriving after replacement remains
inactive when it explicitly points to the replaced assertion.

## Separation from lineage

Two items with one `lineage_id` are not automatically dependencies. Lineage is
a coarse source classification used by the action threshold; `dependsOn` is an
assertion-level edge used by snapshot projection. A connector must not invent
either relation from similarity alone.

For OSV this means that `aliases` can establish identity of the vulnerability,
but not copying of an advisory assertion. An import or transformation receipt
must explicitly bind a normalized assertion to the prior item before withdrawal
or replacement can invalidate the dependent copy.

## Evidence and limits

Focused tests retain an origin, dependent copy and independent assertion; replace
the origin; reload the journal; and verify that only the independent assertion
can support the query. A control verifies that a shared lineage without
`dependsOn` does not create a dependency.

This is a bounded truth-maintenance mechanism for declared dependencies. It does
not discover hidden copying, decide whether a correction is true, map external
record history automatically, or propagate a withdrawal across semantically
related assertions without an explicit edge.

