# Temporal reasoning stress v1

Date: 2026-09-13. Status: pre-run protocol; fixture and model results do not
yet exist.

## Question

Can executable memory preserve a multi-step conclusion and its exact active
support after a source assertion is copied, replaced or withdrawn, including
after process restart? Separately, does a trusted checker receipt improve a
model's exact answer over the same formal memory without execution?

## Fresh deterministic population

Generate 36 cases as the complete Cartesian product of:

- inference depth: 3, 5, 8 rule applications;
- topology: chain or same-entity conjunction joins;
- changed assertion: seed fact or bridge rule;
- transition: positive→negative, negative→positive, or withdrawal.

Every case has a distinct hash-derived subject and predicate namespace. The
changed assertion is admitted at revision 0. A mirror assertion is then admitted
with an explicit dependency on it. At revision 1 the origin is replaced by an
opposing assertion or a withdrawal tombstone. The agent is reconstructed from
the journal before the final query. Unrelated decoys remain present.

The generator must obtain the oracle from the real SWI checker over the active
post-restart snapshot. It must also run a no-dependency ablation. Expected
current statuses are `entailed`, `contradicted`, or `unknown`; a direct conflict
in the dependency-aware current snapshot invalidates fixture generation.

## Model conditions

Each case uses one frozen semantic world and query.

1. P0 receives the natural-language event history and answer contract.
2. P1 receives equivalent formal events, Prolog clauses and dependency fields,
   without checker output.
3. P2 receives byte-identical P1 plus a trusted host receipt containing the
   post-restart snapshot hash, status and minimal support set.

The answer is one status plus the exact sorted item IDs supporting the query or
its explicit opposite. `unknown` has an empty support list. Primary comparison:
paired P1→P2 exact status-and-support accuracy. P0→P1 is secondary.

Use one pinned model and reasoning effort, one call per case and condition, no
retry, repair, tools or case replacement. Alternate condition order by case.
Retain exact requests, responses, usage and process evidence. Gold and the
no-dependency outcome remain scorer-only.

## Deterministic mechanism comparison

Before model calls, compare the same journal episode with and without the
mirror's `dependsOn` edge. Report current status, active item IDs, stale support,
restart equality and checker support. This comparison establishes only the
effect of the implemented dependency contract.

## Metrics

Primary:

- exact status plus exact support IDs for P1 versus P2;
- stale-support decisions in dependency-aware versus no-dependency execution.

Secondary:

- status accuracy;
- support accuracy conditional on status;
- results by depth, topology, changed assertion and transition;
- P0 versus P1 paired cells;
- input/output tokens and runtime;
- false conflict, false unknown and use of replaced support.

## Failure rules

Any generator/checker mismatch, invalid program, wrong measured depth, unstable
restart snapshot, duplicate item ID, leaked oracle field or non-equivalent P0/P1
rendering aborts the entire pre-run fixture. After source freeze, a failed model
call remains failed in the denominator and is not retried or replaced. Any
contract change creates v2.

## Claim boundary

The deterministic wave can demonstrate multi-step truth maintenance over this
generated family. A live P1→P2 difference can estimate receipt utility for one
model on this frozen stress set. Neither result proves natural-language
formalization quality, clinical validity, general logical intelligence,
autonomous tool use, or broad superiority of Prolog.
