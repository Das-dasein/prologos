# Paired biographies v1 — v1.0.1

Changelog: v1.0.1 pins oracle visibility, mode isolation and authorship limits.

## Problem and scope

The existing Hermes experiment compares two orion histories. The user requests a
JSONL schema, 12 explicitly authored causal dialogue pairs and a harness running
the same cases in four memory conditions. This local wave delivers that artifact;
it does not assert that memory, Prolog or dreaming improves general performance.

## Execution boundary

Coordinator: Sigma, delta=gamma. Dataset author and implementation author use
separate fresh alpha sessions; beta is a fresh independent session. This is local
artifact work against the present dirty checkout. No changes to existing user
work, no commits, remote publication, merge, tag, or upstream Sigma changes are
required. The normal remote branch/release cycle is outside this local request;
this record is not a completed remote CDD release. Canonical role skills are at
`/Users/artem/Documents/code/cnos/cnos/src/packages/`.

## Implementation contract

| Axis | Binding |
|---|---|
| Language | Existing CommonJS Node.js, JSON/JSONL; Python only for the installed Hermes adapter |
| CLI integration | New local CLI under `world/paired-biographies/`, package scripts if useful |
| Package scope | Dataset/schema/docs in `.cdr/datasets/paired-biographies-v1/`; harness under `world/paired-biographies/`; local evidence under `reports/paired-biographies-v1/` |
| Existing binaries | Reuse SWI checker and installed Hermes; do not replace either |
| Runtime dependencies | Existing Node, SWI-Prolog, Hermes Python venv; no new package dependency unless essential and documented |
| Wire contract | Versioned schema; structured extraction and move outputs; explicit error/skipped/not-run states |
| Compatibility | Existing world/provider behavior remains intact; no permanent changes to Hermes global config or memory |

## Acceptance criteria

User category list: missing premise versus independent path; fact versus explicit
negation; direct conflict; conflicted dependent chain with preserved independent
proof; old rule superseded; expired validity; user assertion versus hypothetical
example; model assertion without user source; long history with distractors;
same meaning in different phrasings; question memory already answers; stopping
for insufficient data.

User record keys: `case_id`, `old_dialogue`, `current_dialogue`,
`domain_projection`, `accepted_memory`, `candidate_memory`, `query`,
`expected_epistemic_status`, `expected_next_move` with `kind` and
`semantic_target`, `acceptable_questions`, `required_proof_items`,
`forbidden_behaviors` (including `treat_candidate_as_fact` and
`infer_negative_from_absence`). Add fields rather than rename these keys.

1. Exactly 12 explicit pairs / 24 case records. Same current_dialogue, query,
   domain_projection and decision policy within each pair; only old biography
   and its derived oracle differ. Include all 12 user categories. Distinguish
   contrast pairs from invariance controls (paraphrase/noise); do not demand a
   change where semantics should remain equal.
2. Each record contains the user's requested fields plus pair identity,
   intervention explanation, source/message IDs, explicit timing/supersession,
   oracle rationale and review status. Source links and required proof item IDs
   resolve. Hypothetical/assistant-only content is never accepted as user fact.
   Synthetic authored fixtures are labeled AI-authored/independently reviewed,
   never human-reviewed without a human signoff. No LLM generator creates gold.
3. JSON Schema and fail-closed validation cover structure and cross-record
   invariants. The dataset manifest pins byte hash, origin, intended use,
   redistribution and human-review status. Case oracles are explicit constants,
   not computed by the runtime under test; run the actual checker against them.
4. Four executable conditions: no long-term memory; ordinary text memory;
   structured memory with no Prolog execution; same structured memory with
   harness-enforced real Prolog check. Optional dream is deferred, with per-case
   eligibility annotation and justification. No fake fifth measurement.
5. Three separate score surfaces: dialogue-to-candidates extraction; accepted
   memory lifecycle/status/proof; Hermes next move. Gold-memory and extracted
   memory evaluations must be labeled separately. A gold load is not extraction
   evidence. Oracle fields, pair IDs, expected decisions and checker results
   must not leak into the first three model conditions. Current dialogue and
   source evidence, including supersession and time, must be semantically
   equivalent across text and structured memory conditions.
6. Hermes uses fresh isolated sessions/config/memory per case and mode, same
   model/settings and bounded calls. Baselines cannot access world tools, shell,
   filesystem, previous sessions or oracle files. Checked mode must have an
   actual host-controlled receipt (a prompt asking it to query is insufficient).
   Preserve exact prompts, responses, usage, configurations, hashes and errors.
   No real-world actions are dispatched; only next-move decisions are scored.
7. Scores reject forged/missing proof IDs, wrong targets, malformed output,
   missing required calls, crashes and timeouts; neither zero denominators nor
   failed runs count as successes. Pair joint accuracy and contrast/invariance
   outcomes are reported alongside item scores. Account for question alternatives
   and uncertainty. No regex substring scoring of free prose. Distinguish what
   forbidden behaviors can actually be observed from what remains unaudited.
8. Meaningful negative/mutation tests for leaks, candidate admission, negation
   from absence, temporal/supersession errors, cross-case leakage and scorer
   false positives. Independent beta reviews dialogue/oracle semantics and
   reproduces deterministic checks. Preserve all existing unrelated changes.

## Verification and deliverable

Offline validation and all 24 gold memory/status/proof checks must run locally.
The four-mode runner must be real and exercisable with installed Hermes; run a
bounded real smoke before claiming integration. If a full 96-turn comparison is
run, retain its complete evidence and report it as a synthetic development pilot
with human review pending, never as a positive CDR claim. Instructions must give
exact full-run commands. Honest errors stay in reports and no oracle tuning
after seeing model outputs is permitted without a new dataset version.

## CLP

Pattern: paired historical intervention with three separable measurement layers.
Relation: existing conservative signed-Horn semantics and project CDR policy.
Exit: negative/inconclusive outcomes valid; human gold approval remains pending.
