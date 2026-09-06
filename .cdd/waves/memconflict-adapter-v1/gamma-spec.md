# CDD γ specification: memconflict-adapter-v1

## Problem

The project needs a controlled long-term-memory evaluation with both mutable
facts and rule-based inference. Existing local fixtures verify a small
hand-authored lifecycle contract; they do not provide a public, multi-session
source with structured dynamic/static/conditional conflicts. MemConflict is a
candidate source, but its raw JSONL is external, large, and currently has no
declared license.

## Scope

Implement an offline-only, operator-path-based adapter that inspects one
operator-provided `Step4_4.jsonl` source and produces a deterministic **local,
gitignored** 24-case fixture plus an engine-computed oracle. The adapter must
not download data, call a provider, alter the chat runtime, or emit a CDR
result. It is an ingestion/method implementation, not a memory-utility claim.

## Inputs and outputs

Input arguments:

- `--source`: absolute operator-provided `Step4_4.jsonl` path;
- `--source-commit`: exact upstream Git revision;
- `--selection`: versioned checked-in selection specification containing only
  record IDs and expected source categories;
- `--out`: fresh absolute local output directory outside the repository.

Output files, all written only under `--out`:

- `source-manifest.json`: source SHA-256, byte count, upstream revision and
  selection SHA-256;
- `fixture.json`: selected source excerpts, normalized session/turn IDs,
  assertion candidates, conflict metadata and declared query category;
- `oracle.json`: deterministic active state, conflict status, answer and proof
  basis for every selected case;
- `rejection-report.json`: every excluded record and a typed reason.

The adapter must reject a source whose observed schema cannot supply the
declared mapping. It must not silently substitute generated facts, invent a
source span, resolve a static conflict by recency, or fill a missing rule.

## Acceptance criteria

1. No network, provider SDK, shell evaluation of source content, or mutation
   of `data/memory.pl`, registry files or upstream source occurs.
2. The source is streamed/parsed as JSONL; every selected record is bound to
   its immutable record ID, source SHA-256 and session/turn provenance.
3. The fixture contains exactly 24 selected records: eight each of dynamic,
   static and conditional conflict, unless the source schema proves a stratum
   unavailable. An unavailable stratum fails closed with `ineligible`, rather
   than producing a partial fixture labelled complete.
4. Every normalized assertion retains predicate/arguments, polarity, source
   turn, time, lifecycle status and original field path. Dynamic updates retain
   an explicit supersession edge; static/conditional source semantics remain
   distinguishable.
5. Each case has a query class of `direct_recall`, `current_state`,
   `conflict` or `rule_derived`. A `rule_derived` case has a checked-in rule
   whose conclusion is not copied as an evidence fact.
6. Local SWI-Prolog recomputes every oracle answer, active-state choice,
   conflict classification and proof basis from the fixture. The implementation
   fails closed on any mismatch with the source's gold label or ambiguity in
   the mapping.
7. Fixed source, selection and rule hashes reproduce byte-identical fixture
   and oracle outputs. Tests include a dynamic update, a static false conflict,
   a conditional rule, a missing provenance span and a malformed JSONL line.
8. Focused tests and `npm test` pass without a source download or model call.

## Proof plan

- Provider-free fixtures model the three conflict types and adversarial source
  gaps.
- A source-integrity test uses a small locally authored schema-shaped sample;
  it proves parser/normalizer behavior but is not a MemConflict result.
- An optional operator-local command may validate the real source's SHA,
  schema and selected IDs. Its output remains local evidence until upstream
  terms are resolved.

## Non-goals

- No live B1–B5 collection, result dashboard, claim receipt or LLM-as-judge.
- No assertion that MemConflict's generated prose is factual outside the
  benchmark.
- No public redistribution or Git commit of upstream rows.

## β dispatch

β must inspect an immutable α commit from a clean copy, run all provider-free
tests, attempt malformed/missing/foreign source paths, verify the no-download
boundary, independently recompute the local oracle, and confirm that the
source-license gate remains explicit. β returns `GO`, `REVISE`, `NO-GO`, or
`INDETERMINATE` only for this adapter scope; it cannot issue a PAM-C1 result.
