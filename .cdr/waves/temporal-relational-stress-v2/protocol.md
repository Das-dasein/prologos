# Temporal relational stress v2

Date: 2026-09-13. Status: deterministic fixture frozen; model collector and
model results do not yet exist.

## Motivation

`temporal-reasoning-stress-v1` did not create a semantic P1 ceiling break.
Luna returned the correct status and support set for all 36 formal histories;
its two primary P1 errors were only non-canonical ID ordering. Increasing a
visually isolated route from three to eight rules was therefore insufficient.

V2 tests the combined burden that v1 omitted: variable binding across several
entities, interacting proof paths, more than one revision, and worlds where
positive and explicitly negative conclusions can coexist.

## Frozen population design

Generate 32 cases as the complete Cartesian product of:

- measured proof depth: 4 or 7 rule applications;
- graph: relational chain-of-joins or relational diamond;
- revision count: 2 or 4 source changes before restart;
- final status: `entailed`, `contradicted`, `unknown`, or `conflict`.

Each world must contain at least four named entities and at least two binary
predicates. Every non-unknown query requires a variable binding to travel
through more than one entity. Diamond worlds contain at least two candidate
proof paths; revision projection must invalidate one path without revealing the
survivor in predicate or item names. Conflict worlds require one active support
for the query and one for its explicit opposite. Unknown worlds retain a
near-complete path missing exactly one active premise.

Every episode admits dependent copies from at least two source groups, applies
the declared replacements or withdrawals in an interleaved order, reconstructs
`WorldAgent` from the journal, and obtains the oracle from the real checker.
Generation fails if measured depth, final status, support multiplicity,
dependency projection, or restart identity differs from the declared stratum.

Names are neutral hash-derived symbols. Case IDs, target status, scorer fields
and route roles never appear in a model prompt.

## Conditions

Each case uses one frozen semantic world and query.

1. P0 receives the equivalent natural-language event history.
2. P1 receives formal journal events, clauses and dependency fields without
   checker output.
3. P1F receives only the final active formal snapshot. This diagnostic isolates
   temporal projection burden from reasoning over the resulting world.
4. P2 receives byte-identical P1 plus a trusted receipt containing snapshot
   hash, final status and complete minimal support sets.

Use one pinned model and reasoning effort, one call per case-condition pair, no
retry, no fallback, no tools and no replacement calls. Rotate condition order
across cases.

## Metrics

The primary comparison is paired P1→P2 status accuracy. Status is scored
independently of formatting and support serialization. Secondary comparisons
are P0→P1 status, P1→P1F status, and exact complete support-set accuracy.
`conflict` must remain distinct from `unknown`.

Report runtime failures separately. A provider response recovered from raw
transport evidence after an adapter failure is diagnostic only and does not
replace the frozen call score.

## Required controls

- correct dependency-aware journal projection;
- no-dependency ablation showing at least one changed outcome per revision
  stratum;
- flattened P1F snapshot checked to be byte-derived from the same active items
  used for the P1/P2 oracle;
- predicate/item-name leak scan;
- exact fixture regeneration and source hashes before model calls;
- independent report replay from raw adapter evidence.

## Claim boundary

The deterministic fixture can establish bounded relational truth maintenance
for this generated family. A P1→P2 difference can estimate receipt utility for
one model on the frozen status task. It cannot establish natural-language
formalization fidelity, autonomous checker use, clinical reasoning, general
logical intelligence, or production utility. If P1 again reaches a semantic
ceiling, that is a negative result and no receipt advantage is claimed.
