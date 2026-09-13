# OSV revision dependency experiment v1

Date: 2026-09-13. Status: preregistered design; dataset and results do not yet
exist.

## Research question

Does assertion-level dependency tracking prevent an agent from acting on a
copied assessment after its concrete source assertion is replaced or withdrawn,
including after process restart and stale re-delivery?

## Frozen population and selection

Use 24 GitHub-reviewed npm advisory entry histories from one pinned commit of
the public `github/advisory-database` repository. Freeze the repository commit,
exact old and new blobs, blob hashes and selection program before execution.

A case is eligible only when one entry id has at least two valid OSV revisions
and the later revision either changes the deterministic classification of a
prespecified package version or withdraws the record. Sort eligible cases by
entry id and take the first 24 after deterministic validation. The target
version must be derived by the frozen selector from the changed boundary; it
cannot be chosen after observing system behavior.

This is a revision stress set. Its rate of changes cannot estimate how often
OSV records change or how often ordinary users encounter stale advice.

## Episode

For each case:

1. Admit the old OSV assertion.
2. Admit an explicit imported copy whose `dependsOn` names that assertion.
3. Admit the later revision with `replaces` pointing to the old assertion, or
   process its withdrawal.
4. terminate and recreate `WorldAgent` from the same journal;
5. deliver the stale old record again with its original revision identity;
6. request one of `report_current_assessment`, `request_source`, or
   `flag_conflict` according to the frozen oracle.

No model calls are made. All transformation, admission and oracle decisions are
deterministic and replayable.

## Systems compared

1. a simple JavaScript current-record aggregator;
2. current `WorldAgent` with explicit assertion dependencies;
3. a no-dependency ablation that retains the copied assertion after replacement;
4. an independent JavaScript truth-maintenance implementation of the frozen
   episode contract.

The independent implementation must not import journal snapshot or Prolog
checker code from `world/`.

## Outcomes

Primary outcomes:

- exact action accuracy against the frozen oracle;
- stale-basis decisions: an action supported by an assertion whose dependency
  is inactive after replacement or withdrawal.

Secondary outcomes:

- false pauses;
- extra source questions;
- decisions that cite the replaced revision;
- equality of the pre-restart and post-restart active projection;
- runtime and retained state size.

Report per-case results and paired differences. With 24 selected cases, treat
counts and confidence intervals as descriptive evidence for this stress set;
do not generalize them to OSV as a whole.

## Failure and exclusion rules

Parsing failure, unsupported range type, ambiguous revision order, missing
exact blob, or selector disagreement excludes a case before the first system is
run and advances to the next sorted eligible id. A crash after any system sees
a case remains a recorded failure; the case is not replaced. Any protocol or
oracle change creates a new version rather than editing this file in place.

## Claim boundary

The experiment can test whether the implemented dependency contract prevents
stale copied assertions from controlling these deterministic episodes. It
cannot establish vulnerability truth, clinical utility, general agent memory,
or a unique scientific contribution. The completed two-record live pilot is
separate exploratory evidence and is not one of the 24 evaluation cases.
