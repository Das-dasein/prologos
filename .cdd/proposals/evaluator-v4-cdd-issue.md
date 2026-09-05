# CDS: define structured evaluator v4 before the next live pilot

Labels: `bug`, `P2`

Mode: **design-and-build**  
Protocol: **CDS**, consumed later by CDR wave `prolog-memory-eval-v0`  
Priority: **P2, dependency-first** — the next paid B1–B4 run is blocked until
the measurement contract is valid.

## Problem

What exists: `offline-eval-v3.js` reproducibly replays frozen artifacts, but
its primary answer oracle is a case-specific keyword matcher. The current
answer envelope is free text plus optional provenance arrays; the schema does
not validate complete nested condition/case content, and raw integrity checks
do not prove that every planned output exists and is the output scored.

What is expected: a prospective v4 contract that separates extraction
operations, memory state, structured answer semantics, evidence binding, and
optional free-text quality. Deterministic scoring must compare typed content
against independently registered gold and fail closed on missing or ambiguous
evidence.

Where they diverge: current counterexamples produce invalid verdicts:

| Case | Candidate answer | v3 result | Required result |
|---|---|---:|---|
| `stable-01` | `You do not live in Samara; you live in Kazan.` | pass | factual failure |
| `correction-02` | `Your current project is Borealis. Atlas was replaced.` | fail | correct historical mention |
| `temporal-01` | `You did not live in Omsk in 2021.` | pass | polarity failure |
| `conflict-01` | unresolved conflict plus a definite one-sided conclusion | pass | conflict failure |
| `ambiguity-01` | clarification wording plus a definite invented resolution | pass | unsupported resolution |
| `nonmemory-01` | `unknown` plus an unrelated durable assertion | pass | unsupported assertion |

These outcomes were reproduced directly against the exported
`contentVerdict()` on 2026-09-05. Adding more regular expressions is not an
acceptable repair.

## Impact

The current scorer can produce both false accepts and false rejects. A paid
live run can therefore be reproducible while still measuring the wrong
construct. PAM-C1, B3/B4 comparison, and any model-quality result remain
blocked; the interrupted `reports/live-20260905-225936/` run is diagnostic
material only and is not evidence for this cycle.

## Status truth

- Evaluator v3 and its frozen replay are bounded engineering diagnostics.
- The v4 contract and scorer do not exist.
- No current artifact establishes PAM-C1, causality, superiority, utility, or
  long-context benefit.
- The current live-v2 runner has additional runtime-design defects, but they
  are deferred to a separate CDS cycle after this contract is stable.

## Source of truth

| Claim / surface | Canonical source | Status | Notes |
|---|---|---|---|
| Current scorer | `offline-eval-v3.js` | implemented, bounded | keyword content rubric |
| Current replay schema | `schemas/offline-eval-v3.schema.json` | implemented, incomplete | nested evidence is under-specified |
| Repair direction | `.cdr/proposals/evaluation-contract-repair-v3.md` | proposal | prospective constraints, not implementation |
| Research policy | `.cdr/POLICY.md` | binding | claim and budget boundaries |
| Current wave state | `.cdr/waves/prolog-memory-eval-v0/status.md` | `REVISE` | no PAM claim transmissible |
| Dataset and gold | `.cdr/datasets/dialogues-pilot-v1.jsonl`, `.cdr/results/prolog-memory-eval-v0/answer-oracle-v1.json` | regression-only inputs | must not be silently reinterpreted |

## Scope

In scope:

- define exact JSON schemas for `memory-answer-v4`, extraction-operation
  decisions, evidence references, and offline replay v4;
- implement a provider-free structured scorer with explicit
  `answer | conflict | clarify | insufficient_data` decisions;
- compare assertions one-to-one by registered relation, arguments, polarity,
  modality and interval semantics;
- validate `answer claim -> evidence ref -> source assertion -> independent
  gold` instead of accepting a turn number alone;
- distinguish missing, unknown, not-applicable, fail and pass without removing
  planned cases from denominators;
- bind every scored parsed output to its raw envelope and require the complete
  planned condition/case/turn inventory;
- add adversarial and schema fixtures plus operator documentation.

Out of scope:

- live provider/model calls or evaluation of the interrupted partial run;
- integrating v4 into `pilot-runner.js`;
- changing B1–B4 context construction, isolating B3/B4, or enforcing Codex CLI
  runtime budgets and sampling;
- authoring the prospective long-context holdout;
- LLM-as-judge, human annotation execution, thresholds, significance tests,
  baseline selection, or any PAM-C1 result;
- global semantic aliases such as `uses = knows_technology`.

Deferred in dependency order:

1. integrate the stable v4 answer contract into the live runner, pass the same
   natural-language question to B1–B4, enforce provider runtime controls, and
   isolate B3/B4 on one frozen extraction ledger;
2. pre-register and author a prospective long-context holdout;
3. run Luna, freeze raw artifacts, then obtain fresh independent CDR beta
   review.

## Cycle scope sizing

| Factor | Reading | Splitting signal? |
|---|---|---|
| New code surface | one coupled schema/scorer contract plus fixtures | no |
| Cross-module breadth | evaluator, schemas, tests, docs | yes |
| Lifecycle span | design-and-build; no provider or research execution | no |
| MCA stability | v4 design is not yet a committed stable contract | design-and-build |
| Independent shippability | schemas without scorer would not close the gap | no |

Decision: keep as one typical seven-AC cycle. Runtime integration and dataset
design are independently shippable and therefore explicitly split out.

## Acceptance criteria

### AC1: Exact structured contracts

Invariant: v4 schemas fully constrain answer decisions, claims, conflicts,
clarification, evidence refs, extraction operations and replay nesting.

Oracle: executable schema validation accepts canonical fixtures and rejects
unknown nested fields, inconsistent branches, duplicate/missing cases,
contradictory run IDs and incomplete hash sets.

### AC2: Deterministic typed scoring

Invariant: primary correctness is derived from structured content, not words in
free text.

Oracle: ID renaming and record order do not change metrics; wrong relation,
argument, polarity, modality or interval does.

### AC3: Decision-specific semantics

Invariant: `answer`, `conflict`, `clarify`, and `insufficient_data` have
different required evidence and scoring behavior.

Oracle: missed/unnecessary clarification, one-sided unresolved conflict,
unsupported answer and valid abstention have distinct fixtures and metrics.

### AC4: Provenance validity

Invariant: provenance passes only when every answer assertion cites evidence
that supports that exact assertion and resolves to the registered source.

Oracle: fabricated IDs, correct turn/wrong claim, correct claim/wrong interval,
and dangling evidence refs fail closed.

### AC5: Complete raw binding and denominators

Invariant: every planned condition, case, extraction turn and answer has one
raw reference whose digest binds the parsed value being scored.

Oracle: empty reference inventory, missing turn, duplicate case, raw/parsed
mismatch and hash mismatch are not `valid`; missing outputs remain in the
planned denominator and widen the reported uncertainty bounds.

### AC6: Adversarial regression proof

Invariant: the six v3 counterexamples in `## Problem`, explicit negation,
historical stale mentions, extra unsupported facts and injection-shaped text
cannot receive a false primary pass.

Oracle: a focused v4 sentinel command exercises positive and negative fixtures
without provider/network calls.

### AC7: Compatibility and evidence boundary

Invariant: v3 artifacts remain readable by v3 and are not silently upgraded;
v4 writes a new versioned artifact and documentation states its limits.

Oracle: existing tests plus v3 schema/sentinel tests pass; no live output,
claim-ledger promotion, CDR receipt, superiority statement or mutation of the
partial diagnostic run appears in the diff.

## Proof plan

Invariant: the same frozen structured inputs produce byte-stable v4 results,
while malformed or semantically inconsistent evidence fails closed.

Surface: new v4 schemas/scorer/tests and versioned documentation; existing v3
files remain compatibility surfaces.

Positive case: canonical answer, operation ledger, complete raw manifest and
registered evidence chain produce exact per-field metrics.

Negative case: each AC names at least one fixture that must reject or score a
specific failure/unknown state.

Operator-visible projection: one documented `npm` test command and one offline
v4 replay command; neither may construct or invoke a provider.

Known gap: free-text semantic quality remains outside the primary deterministic
score. A future blinded annotation protocol may assess it separately after
calibration; it must not overwrite structured results.

## Skills to load

Tier 1/2:

- canonical CDD loader, CDD alpha/beta role skills, issue/design/plan/review;
- CDS implementation/testing discipline;
- CDR loader and `.cdr/POLICY.md` for the evidence boundary.

Tier 3:

- Node/CommonJS and JSON Schema implementation/testing surfaces already used
  by this repository.

## Active design constraints

- Primary scoring is structural and provider-free.
- Gold is independent input, not inferred from Prolog output or candidate text.
- Missing evidence never becomes pass.
- IDs are references, not semantic equality keys.
- Free text cannot rescue an incorrect structured envelope.
- Existing dataset semantics are not repaired through post-hoc aliases.
- All hashes, schemas, prompts and source identities remain versioned.

## Related artifacts

- GitHub #20 — evaluation-matrix preregistration.
- GitHub #21 — live B1–B4 pilot; blocked on this repair and later runner repair.
- `.cdr/proposals/evaluation-contract-repair-v3.md`.
- `.cdr/waves/prolog-memory-eval-v0/alpha-live-v2-preflight-report-r1.md`.
- `.cdr/waves/prolog-memory-eval-v0/receipt-offline-eval-v3.yaml`.

## Non-goals

This cycle does not prove that Prolog improves memory, does not choose the
strongest baseline, does not report live model quality, and does not turn the
12-case regression set or interrupted partial run into prospective evidence.

## Success / closure condition

This issue is closeable when all seven ACs map to committed evidence, the
focused and full regression commands pass from the review target, independent
CDD beta approves the exact immutable implementation commit, and every
remaining runtime/research gap is carried to a named follow-up rather than
silently absorbed into a v4 success claim.
