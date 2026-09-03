# Entity-centric tree visualizer v0

Status: design artifact for GitHub issue #1. This document defines the
projection before implementation; it does not authorize loading private
exploratory memory or changing assertions.

## Boundary

The viewer is a read-only projection of synthetic/demo data. The default
route loads only a checked-in fixture. `data/memory.pl` is never a default
source. A user may explicitly select another file in a local browser; the
viewer does not write it back.

## Projection model

| Object | Meaning | Required provenance |
|---|---|---|
| entity node | stable argument/entity identifier | source assertion IDs |
| assertion edge | one registered proposition from the selected entity | assertion ID, source, time |
| negative edge | explicitly negative assertion | polarity and assertion ID |
| derived edge | rule output, not source fact | rule ID and supporting assertions |
| tension marker | competing or conflicting records | all input assertion IDs and status |
| qualifier panel | modality, time, confidence, unresolved fields | original assertion ID |

The root entity is selected explicitly. Traversal is bounded to depth 1 in v0
and to the assertions that mention the root. Unsupported predicates are shown
as unknown records or omitted with a deterministic reason; they are never
invented or relabelled.

## Fixture and smoke oracle

The fixture contains one positive relation, one negative relation, one
qualified assertion, one derived relation, and one tension. The expected
projection is the fixture's `expected` object. A private sentinel is deliberately
absent. The smoke test must verify the default HTML source contains no route to
`data/memory.pl`, and that selecting the fixture root returns exactly the listed
nodes and edges.

## Acceptance mapping

- AC1: projection table plus `entity-centric-tree-v0.json` define node/edge
  semantics and provenance.
- AC2: fixture-only default and private-sentinel negative test define the
  read-only data boundary.
- AC3: polarity, derived, qualifier, and tension markers are distinct in the
  expected projection.

## Deferred implementation

The follow-up implementation may add a parser/adapter and browser rendering,
but must consume this fixture first and must not turn the viewer into a memory
editor, an unbounded graph explorer, or a research-result display.
