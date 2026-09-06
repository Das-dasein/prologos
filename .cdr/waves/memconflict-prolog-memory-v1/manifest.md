# CDR wave manifest: memconflict-prolog-memory-v1

Status: `hypothesized`; research-intake and CDD handoff only. No external
dataset bytes have been vendored, no model run has occurred, and this document
does not create a CDR receipt.

## Question

Under the same answering model, extraction prompt, input history and measured
context budget, do typed, time-scoped assertions plus deterministic Prolog
rules reduce incorrect answers about changing, conflicting and
condition-dependent conversational facts relative to the strongest non-Prolog
memory baseline?

This is an instantiation of `PAM-C1`, not a new claim. It evaluates both
memory and inference:

1. retain and update facts from a multi-session dialogue; and
2. derive the answer to a query from the retained facts and declared rules,
   returning its evidence.

A fact-store that merely retrieves the latest sentence does not satisfy the
second part. Conversely, a static rule-theory benchmark does not evaluate
long-term memory.

## Candidate source and eligibility gate

Candidate source: `TaoZhen1110/MemConflict`, Git commit
`ec51d5d36e87f7665d1337f3a88cbde95fc2a964`, observed on 2026-09-06.
The repository publishes a construction pipeline and JSONL data, including
`Data/Step4_4.jsonl` (observed size 39,671,712 bytes), with structured fixed
and dynamic profiles, session dates, dialogue turns, conflict metadata, query
metadata and gold labels.

The upstream repository did not declare a license and has no `LICENSE` file at
the recorded revision. Therefore the dataset is **read-only and
non-redistributable by default**. It must not be committed, copied into a
provider prompt, published with results, or used for a public benchmark claim
until the maintainer grants terms compatible with that use. CDD may implement a
local adapter accepting an operator-provided source path; it may not download,
vendor or redistribute the source.

## Intended protocol

The future study uses the conditions already fixed by `.cdr/POLICY.md`:

| Condition | Memory supplied to answerer | Purpose |
| --- | --- | --- |
| B1 | recent turns only | short-context baseline |
| B2 | rolling text summary | conventional text-memory baseline |
| B3 | typed assertions and deterministic latest-value handling, no Prolog rules | structured non-Prolog baseline |
| B4 | the same typed assertions plus Prolog active-state, conflict, provenance and declared rule queries | target condition |
| B5 | B4 supplied with gold assertions | symbolic/extraction ceiling only |

The answer model, sampled histories, ordering, extraction model/prompt, and
measured effective context budget must be identical wherever a condition uses
an LLM. The B4 query must be executed by the harness, not left as a voluntary
tool action for the answer model.

## Dataset-to-memory contract

A selected fixture must preserve, without LLM-derived oracle fields:

- session ID and date as provenance/time;
- source turn ID and verbatim span for each proposed assertion;
- profile/timeline value and supersession relation where the source marks a
  dynamic update;
- conflict type (`dynamic`, `static`, `conditional`) and its structured target
  field or condition;
- question, gold answer, and source records used to derive it.

The local oracle is computed from the structured source profile/timeline and a
versioned rule set, never from model output. Each fixture query must be tagged
as one of: direct recall, update/current-state, conflict handling, or
rule-derived. The rule-derived stratum requires at least one conclusion absent
as a surface fact in the evidence turns.

Static conflict is not silently resolved by a generic last-write-wins rule;
the adapter must use only the source's recorded authoritative/false-conflict
semantics. Conditional preference must retain both value and condition, then
be queried through a declared Prolog rule. If the source fields do not support
these mappings unambiguously, that stratum is `ineligible`, not improvised.

## Pre-registered first slice

The first implementation target is a local 24-case fixture selected before any
model output: eight dynamic, eight static and eight conditional conflict cases.
Within every stratum it must include direct/current-state and rule-derived
queries where source fields permit them; otherwise the shortfall is recorded
and no comparative run is authorized. The fixture manifest records upstream
commit, local source SHA-256, selected IDs, mapping version, rule-set SHA-256,
and all exclusions.

The initial CDD phase is strictly offline: inspect schema, build the adapter,
emit the fixture and independently recompute each oracle. A later CDR alpha
may collect model outputs only after CDD beta accepts this phase and the source
eligibility gate is resolved.

## Falsifiers and non-goals

`PAM-C1` is not supported if B4 fails to improve stale-or-contradictory answer
error relative to the strongest permitted baseline, or if the apparent benefit
disappears under equal extraction and context controls. A zero or negative
result is a valid `REVISE` or `NO-GO` outcome.

This wave does not claim that Prolog improves general intelligence, natural
language extraction, or arbitrary programming ability. It does not claim that
MemConflict is a clinical, personal or production dataset. It does not use
LLM-as-judge as the primary oracle.
