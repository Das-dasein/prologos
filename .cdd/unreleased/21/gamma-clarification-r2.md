# Gamma clarification/scaffold: cycle 21 repair round R2

Issue: GitHub #21, `CDS: run LLM + Prolog pilot for Matrix A/B`.
Branch: `cycle/21`.
Base: `d3c1191385327073c7192a4ea43ed9560c0f07fd` (local `main`, after the
prospective CDR v2 and dashboard repairs).
Role: γ `<gamma@prologos.cdd.cnos>`.
Date: 2026-09-05.
Status: local CDS repair dispatch; issue #21 remains OPEN. No GitHub issue
edit, provider call, comparative run, merge, or push is authorized by this
artifact.

This file is the R2 clarification and repair scaffold. The existing
`.cdd/unreleased/21/self-coherence.md`, `beta-review.md`, and
`gamma-closeout.md` remain historical R1 artifacts and are not overwritten or
retroactively re-scored.

## Gap

The shipped `pilot-runner.js` accepts B1--B5 condition labels, but B1--B4 do
not execute four distinct memory mechanisms or call a final answering model.
`evaluateCase` returns an empty/synthetic answer for B1, filters registered
oracle answers for B2/B3, and treats a B4 Prolog query binding as the answer;
all four conditions use the extraction path. The output is
`prolog-memory-pilot-v1`, while the prospective CDR contract requires truthful
v2 condition artifacts with raw extraction/summary/answer evidence and a
measured common effective budget. `cdr-matrix-harness.js` therefore continues
to report B1--B4 as unavailable/N/A.

The repair closes this software gap only. It makes B1 recent-turns, B2 rolling
summary, B3 typed claims without Prolog, and B4 typed claims plus Prolog
observable and independently scorable, while preserving B5 as the gold
symbolic ceiling. It does not execute the live comparison or make a CDR
claim.

## Status truth

| Surface | Status | Evidence / boundary |
|---|---|---|
| Issue #21 | OPEN | `gh issue view 21 --json state` read during γ intake |
| Existing `pilot-runner.js` | Shipped R1 implementation | Accepts labels B1--B5; B1--B4 lack distinct final-answer paths |
| Existing B5 path | Shipped bounded oracle path | Gold operations plus isolated Prolog; remains an oracle ceiling |
| CDR v2 method | Current prospective spec | `.cdr/methods/prolog-memory-evaluation-v2.md` on base `d3c1191` |
| CDS handoff | Current engineering contract | `.cdr/waves/prolog-memory-eval-v0/cds-handoff-contract-v2.md` |
| Alpha repair report | Current research handoff / evidence boundary | `.cdr/waves/prolog-memory-eval-v0/alpha-repair-report-r2.md` |
| B1--B4 v2 comparative result | Not implemented / unavailable | No answering-model artifacts or measured common `E` exist |
| Live comparative run | Not in this CDS cycle | Requires explicit later opt-in and fresh independent CDR β |

## Authority and source of truth

| Claim / surface | Canonical source | Status | Notes |
|---|---|---|---|
| Prospective units, conditions, budget `E`, leakage, scoring, thresholds | `.cdr/methods/prolog-memory-evaluation-v2.md` | Current spec | Governs CDR meaning; do not alter it in this repair |
| Required input/output and fail-closed behavior | `.cdr/waves/prolog-memory-eval-v0/cds-handoff-contract-v2.md` | Current handoff contract | Governs implementation shape and raw evidence |
| Why R2 is required and what prior code actually did | `.cdr/waves/prolog-memory-eval-v0/alpha-repair-report-r2.md` | Current repair evidence | Historical R1 artifacts remain immutable records |
| CLI integration | `package.json` (`pilot`) and `pilot-runner.js` | Shipped surface | Preserve `npm run pilot` / `pilot-runner.js` entry point |
| Existing extraction schema and provider compatibility | `llm-schema.js`, `schemas/memory-extraction.schema.json`, `live-extraction-harness.js`, provider adapter | Shipped surfaces | Extend through existing CommonJS interfaces where possible |
| Matrix reader | `cdr-matrix-harness.js` | Shipped reader | Consume truthful v2 artifacts; no v1 artifact may be relabeled |
| Dashboard | `pilot-dashboard.js` and generated reports | Existing user dashboard | Out of scope for this repair |

## Impact graph

The repair has this producer/consumer graph:

```text
prospective CDR v2 method + handoff
  -> pinned config, dataset, answer oracle, trusted source hashes
  -> pilot-runner CLI and condition modules
     -> extraction/summary/answer prompts and raw provider envelopes
     -> B1 recent context / B2 summary / B3 deterministic state / B4 Prolog state
     -> truthful v2 per-condition artifacts + aggregate manifest
        -> cdr-matrix-harness.js reader and later CDR β review
```

Upstream producers are the pinned dialogue dataset, answer oracle, extraction
schema/provider adapters, registered ontology, `memory.pl`, and
`domain-rules.pl`. Downstream consumers are the matrix reader, focused tests,
and later CDR review. Every context and answer output must retain source claim
IDs, source turns, and inclusive intervals where the oracle provides them.
The dashboard and its generated HTML are deliberately not a downstream
consumer in this cycle.

Before implementation, α must enumerate peers in the affected directories
and reconcile any matching condition/output/budget symbols. A discovery that
changes this graph is recorded in a new clarification entry before the scope
is expanded.

## Mode and intervention

Mode: substantial CDS design-and-build repair, consumed by a fresh CDR β only
after a future run. The implementation is software matter; this scaffold does
not authorize a research run. α may add a small design/plan artifact if the
chosen decomposition needs one, but the code, tests, wire/config/schema
artifacts, and their proofs are the required output.

The issue-quality and implementation-contract gates are binding. No prompt
may compensate for a missing invariant by inventing a different condition or
using a filtered gold answer.

## Implementation contract

| Axis | Binding decision |
|---|---|
| Language | Node.js/CommonJS in the existing project style. |
| CLI target | Preserve the existing `npm run pilot` / `pilot-runner.js` surface; refactor or add repository modules behind it as needed. |
| Package scope | Repository-root JavaScript modules, tests, configuration, and schema artifacts; no new package manager or runtime framework. |
| Existing disposition | Replace fake B1/B2/B3 label-only behavior with real distinct execution; preserve the B5 oracle ceiling and its `gold_oracle` boundary. |
| Runtime dependencies | Existing Node dependencies and the current Prolog engine. Live Codex/OpenAI adapters remain explicit opt-in and must not run in CDS alpha tests. |
| JSON/wire | Introduce truthful v2 output required by `cds-handoff-contract-v2`; preserve existing v1 reader compatibility only where the contract permits; never mislabel a v1 artifact as v2. |
| Backward compatibility | Existing `npm test` and safe opt-in, isolation, hash, leakage, and trusted-memory gates remain green. User dashboard files are out of scope. |

The v2 wire must include one immutable JSON artifact per condition and an
aggregate manifest. A condition label without all required case records and a
final answer record is `unavailable`, not a score. Missing paths, hashes,
usage, prompt references, raw references, or required condition fields fail
closed before scoring.

## Condition obligations

Every B1--B4 condition runs all 12 registered dialogue histories, performs its
condition-specific memory operation, calls the answering model once per case,
and retains machine-readable raw outputs/prompts or prompt hashes/usage.

| Condition | Required execution and forbidden substitution |
|---|---|
| B1 recent-turns | Pass only the registered recent-turn window and fixed query to the answering model. Do not pass a rolling summary, typed claims, or Prolog result. Record exact window and serialized prompt. |
| B2 rolling summary | Build the deterministic registered rolling text summary from dialogue prefixes; record each update, input turns, hash, and final prompt. Pass no typed claims or Prolog result. A label or post-hoc oracle filter is invalid. |
| B3 typed claims, no Prolog | Use typed extraction claims and a pinned deterministic latest-value/supersession reducer. Pass the resulting typed state and query to the answering model. Do not call Prolog or silently substitute gold claims. |
| B4 typed claims plus Prolog | Use the same typed extraction envelope as B3, explicit revision edges, and the registered Prolog layer. Pass query result, active/conflict state, provenance, and query to the answering model. A query binding alone is not a final answer. |
| B5 oracle ceiling | Preserve separate gold-operation symbolic evaluation and `gold_oracle` evidence boundary. It is not a B1--B4 model condition and is not relabeled or used as a final-answer comparison. |

The effective context budget `E` is selected and pinned before any model output
is inspected. The harness measures the effective budget on every extraction,
summary, and answer request, records per-request values, and rejects scoring
unless all B1--B4 measured maxima and configured `E` agree exactly. The old
4096 value is neither a default nor a hidden fallback.

## Acceptance criteria

### AC1: Distinct condition paths

Invariant: B1, B2, B3, B4 each construct the mechanism named by its condition.
Oracle: focused tests instrument context builders and the Prolog engine, then
assert distinct serialized context kinds and the required call boundary.
Positive: B1 contains only recent turns; B2 contains hashed rolling summaries;
B3 contains deterministic typed state and records zero Prolog calls; B4
contains typed state plus Prolog active/conflict/provenance results.
Negative: a B2/B3 invocation that filters oracle answers, a B3 Prolog call, or
identical B1/B2/B3 context hashes fails the test.
Surface: `pilot-runner.js`, any new root condition/context modules, and
`test-pilot-runner.js`.

### AC2: Final answering-model evaluation

Invariant: B1--B4 call the answering model once per case with the pinned
`PAM-answer-v1` prompt and retain its raw response, usage, assembled prompt
hash, and memory-context reference.
Oracle: fake provider call ledger plus fixture assertions require 12 answer
calls per condition and reject query-only or missing-answer records.
Positive: every B1--B4 case has `answer_request` and `answer` records and an
answering-model usage envelope.
Negative: an extraction-only run, a B4 query binding promoted to `answer`, or
a case missing its final answer is `unavailable`/hard failure and cannot score.
Surface: provider adapter interface, `pilot-runner.js`, v2 result writer, and
`test-pilot-runner.js`.

### AC3: Preselected comparable budget

Invariant: one effective context budget `E` is selected before inspection and
measured on every extraction, summary, and answer request across B1--B4.
Oracle: deterministic budget fixtures and per-request ledger checks require
exact equality of configured `E`, each condition maximum, and every required
measurement.
Positive: the aggregate records the same measured `E` for B1, B2, B3, and B4
and includes the measurement definition.
Negative: missing, inferred, unequal, post-hoc, or legacy-default budget values
fail closed before comparative scoring.
Surface: v2 config validation, request ledger, aggregate manifest, and
`test-pilot-runner.js`.

### AC4: Truthful v2 raw evidence and provenance

Invariant: each condition artifact and aggregate manifest carries v2 schema
identity, source/config/dataset/oracle/trusted-source/prompt hashes, raw
extraction/summary/answer references, reconciled usage, context metadata,
source claim IDs, source turns, and intervals.
Oracle: schema/fixture validation plus clean-archive hash comparison checks
required fields and refuses a v1-shaped artifact labeled v2.
Positive: repeated fake execution from the same clean archive yields equal
normalized aggregate hashes and all 12 case records per B1--B4.
Negative: missing path, raw reference, usage, provenance, prompt hash, or
source identity fails closed; an old `prolog-memory-pilot-v1` artifact remains
v1/unavailable rather than being relabeled.
Surface: root config/schema/result modules, output writer, and focused tests.

### AC5: Exact extraction and final-answer scoring

Invariant: extraction scores and final-answer scores are separate and follow
the v2 oracle semantics with explicit numerator/denominator/rate or `N/A`.
Oracle: fixture cases from `answer-oracle-v1.json` and the registered dataset
assert operation decision, proposal-field accuracy, precision/recall, false
clarification, unsupported assertion, answer exactness, general-answer error,
stale-or-contradictory error, and provenance completeness.
Positive: each cell identifies its source claim IDs, source turns, inclusive
intervals, and classification; baseline selection waits for complete B1--B3
answer runs and reports all three baseline scores.
Negative: string similarity alone, query-binding equality, hidden denominators,
or silent attribution of a B4 answer error to Prolog fails validation.
Surface: scoring modules/results consumed by `cdr-matrix-harness.js` and
`test-pilot-runner.js`.

### AC6: Fail-closed safety and compatibility gates

Invariant: leakage, unsafe payload/query, trusted-source mutation/hash mismatch,
malformed extraction, missing paths, missing usage, and live-provider access
without explicit opt-in prevent provider execution or scoring.
Oracle: negative fixtures assert error codes and provider-call ledger state;
the existing suite is run from a clean checkout.
Positive: fake mode remains deterministic; B5 remains isolated and labeled
`gold_oracle`; `npm test` and focused tests pass.
Negative: private/stable-01 markers in any extraction, summary, or answer
prompt; changed trusted files; absent raw-output directory for live mode; or
unequal budgets aborts before the prohibited operation.
Surface: pre-provider checks, trusted-source snapshots, CLI, and all existing
test gates.

## Proof plan

Invariant: the pilot runner emits truthful, reproducible, condition-specific
v2 evidence for B1--B4 while retaining the bounded B5 ceiling and safety
boundaries.
Surface: `pilot-runner.js`, root modules/config/schema artifacts,
`test-pilot-runner.js`, `cdr-matrix-harness.js`, package scripts, and existing
safe-run tests.
Oracle: fake-provider call ledgers, deterministic fixtures, schema validation,
hash/immutability checks, per-request budget reconciliation, and clean-archive
repetition. No live comparative execution is part of this proof.
Positive case: all B1--B4 conditions have 12 extraction/context/answer records,
truthful v2 envelopes, equal measured `E`, exact scoring cells, and raw
references; B5 remains a separate gold ceiling.
Negative case: any label-only path, query-only answer, filtered oracle answer,
missing required path/usage, leakage marker, hash mismatch, or v1-as-v2 output
fails closed and is visible in the command/test result.
Operator-visible projection: `npm run pilot` reports a written v2 artifact or
a named failure code; `npm run test:pilot` and `npm test` report the focused
and regression gate results. A later CDR β reads raw references and the
aggregate, not dashboard-only summaries.
Known gap: fake execution proves software behavior and reproducibility only;
live model quality, PAM-C1--C4, utility/causal/superiority claims, thresholds,
and statistical significance remain unproven until a separately authorized
future run and fresh independent CDR review.

## Constraint strata

Hard gate:

- all 12 cases for each B1--B4;
- distinct condition paths and final answer calls;
- preselected measured common `E`;
- truthful v2 output and complete raw/provenance/usage records;
- B5 `gold_oracle` boundary;
- fail-closed leakage, safety, hash, isolation, and missing-path checks;
- existing `npm test` and safe gates.

Exception-backed: none.

Optional/defaulted: none for comparative evidence. Fake provider may remain the
default local provider only when its evidence boundary is explicit and no live
call is made.

Validated if present: live Codex/OpenAI adapter behavior, raw-output directory
contents, and provider-native usage mapping are validated when explicitly
opted in; alpha tests must use deterministic fake fixtures.

Ignored/deferred: live comparative execution, CDR claims, dashboard changes,
threshold/dataset/oracle changes, production/private data, scheduling, and
significance tests.

## Path and compatibility rules

All repository paths in this scaffold are repo-root-relative from the checkout
containing `package.json`; temporary raw outputs and run artifacts use explicit
caller-provided paths and must never overwrite an existing file. For example,
`pilot-runner.js` resolves the registered dataset as
`.cdr/datasets/dialogues-pilot-v1.jsonl` from the repository root, while a
caller-supplied `--raw-output-dir /tmp/pam-r2-raw` is an external output root.
Required input paths must exist and hash successfully before any provider call.

The existing v1 reader may continue to read historical v1 artifacts only when
its contract explicitly recognizes them as v1. The v2 writer must emit a v2
schema/version and refuse to pass v1 records as v2. Do not rewrite historical
R1 files or the inspected exploratory B4 result.

## Related artifacts and non-goals

Related artifacts: issue #21; `.cdr/methods/prolog-memory-evaluation-v2.md`;
`.cdr/waves/prolog-memory-eval-v0/cds-handoff-contract-v2.md`;
`.cdr/waves/prolog-memory-eval-v0/alpha-repair-report-r2.md`;
`.cdr/results/prolog-memory-eval-v0/answer-oracle-v1.json`;
`.cdr/datasets/dialogues-pilot-v1.jsonl`; `pilot-runner.js`;
`cdr-matrix-harness.js`; and historical `.cdd/unreleased/21/*` artifacts.

This repair does not change the CDR method, claims, policy, thresholds,
dataset, oracle, trusted memory/domain files, dashboard, production memory,
or historical artifacts. It does not run live Codex/OpenAI providers, choose a
baseline from an incomplete run, publish a result, or assert Prolog superiority.

## Skills to load for fresh alpha

Tier 3:

- `cnos.cdd/skills/cdd/issue/SKILL.md` — issue/AC contract and proof boundary.
- `cnos.cdd/skills/cdd/issue/contract/SKILL.md` — source-of-truth and scope.
- `cnos.cdd/skills/cdd/issue/proof/SKILL.md` — independent positive/negative
  oracles.
- `cnos.cdd/skills/cdd/issue/constraints/SKILL.md` — path and cross-surface
  constraints.
- `cnos.cdd/skills/cdd/design/SKILL.md` — impact graph for the multi-module
  repair if α needs a separate design artifact.
- `cnos.cdd/skills/cdd/plan/SKILL.md` — ordered steps if implementation spans
  three or more dependent changes.

Tier 2 engineering bundles must be loaded through the current CDS/CDD loader;
α must also load the project’s existing Node/CommonJS and test guidance when
present. α must not load β or γ role skills.

## Exact alpha dispatch prompt

```text
You are a fresh CDS alpha for issue #21, repair round R2, in
/private/tmp/prologos-cycle21-r2.

Branch: cycle/21
Base: d3c1191385327073c7192a4ea43ed9560c0f07fd
Identity: alpha <alpha@prologos.cdd.cnos>

Load current CDS/CDD authority and the issue/design/proof/constraints/plan
skills required by the gamma artifact before editing. Read issue #21, then
read .cdd/unreleased/21/gamma-clarification-r2.md as the complete local repair
contract. Read the prospective CDR v2 method, CDS handoff, and alpha repair
report named there; they are authority inputs and must not be rewritten.

Implement the software repair behind the existing `npm run pilot` /
`pilot-runner.js` surface. Use Node.js/CommonJS and existing dependencies and
Prolog. Make B1 recent-turns, B2 deterministic rolling-summary, B3 typed
claims with a deterministic no-Prolog reducer, and B4 typed claims plus
Prolog distinct execution paths. B1-B4 must each call the pinned final
answering model once per case and retain raw extraction/summary/answer
outputs, usage, prompt/context hashes, source/config/dataset/prompt/trusted
provenance, source claim IDs, source turns, and intervals.

Select effective budget E before inspecting model output; measure it on every
extraction, summary, and answer request; reject missing or unequal measurements
before scoring. Emit truthful v2 condition artifacts and an aggregate that
the CDR v2 contract can consume. Preserve v1 reader compatibility only where
allowed and never label a v1 artifact as v2. Preserve B5 as a separate
`gold_oracle` ceiling. Keep leakage, unsafe query/payload, trusted hash and
immutability, opt-in/raw-output, isolation, missing-path, usage, and existing
test gates fail-closed and green.

Write meaningful deterministic tests for all ACs, including distinct context
paths, answer-call counts, unequal-budget/leakage/missing-output fixtures,
raw/provenance retention, and clean-archive reproducibility. Do not run live
Codex/OpenAI or any comparative pilot in this alpha session. Do not change
the CDR method, claims, thresholds, dataset, oracle, trusted files, dashboard,
or historical .cdd/unreleased/21 artifacts. Do not review or author beta or
gamma verdicts.

Before signaling review-ready, update self-coherence on cycle/21 with bare
headers `## Gap`, `## Skills`, `## ACs`, `## Self-check`, `## Debt`, and
`## CDD Trace`; enumerate affected peers, bind every AC to evidence, and state
that fake tests prove software behavior only. Commit implementation artifacts
on cycle/21 and report the exact commit plus test commands/results.
```

## Closure and handoff

This clarification is not a verdict and does not close issue #21. A future
fresh α must commit the implementation and self-coherence evidence on
`cycle/21`; independent β must verify every AC and the v2 handoff contract.
Only after beta approval and the normal CDS closure artifacts may γ close the
cycle. A fake run remains software evidence only; a live run, if later
authorized, must return raw artifacts to a fresh independent CDR β.
