# Prolog Agent Memory CDR Policy v0.1.1

Changelog:

- v0.1.2 — prospective PAM evaluation v2 amendment: the next comparative
  run may select an effective context budget above 4096, but must measure and
  preserve exact equality across B1–B4. Previously inspected B4 evidence is
  not retro-validated.
- v0.1.1 — made the falsifier, privacy boundary, and role exits explicit.
- v0.1.0 — initial project binding.

## Prospective v2 amendment

The operator's 2026-09-05 amendment applies only to a future unexecuted
comparative run. The absolute `max_context_tokens=4096` ceiling is removed for
that run. Before model outputs are inspected, the CDS harness must select an
effective context budget `E`, measure it for every extraction, summary, and
answer request, and verify exact equality of the measured B1, B2, B3, and B4
budgets. A configuration label without per-request measurement is not
evidence. This amendment changes no threshold, claim ID, baseline-selection
rule, or claim meaning, and does not retro-validate the already inspected B4
artifact.

## Purpose

Evaluate whether typed, immutable, time-scoped claims plus deterministic
Prolog inference improve an agent's long-term-memory correctness enough to
justify their complexity.

This policy governs research claims. Software changes needed to run an
experiment are separate CDS matter and are referenced from CDR by immutable
source snapshot or commit.

## Claim calibration

Every reported claim must be labelled exactly one of:

- `observed`: directly measured from a declared run and dataset;
- `computed`: calculated from observed outputs by a declared method;
- `inferred`: interpretation not directly measured;
- `hypothesized`: proposed before measurement;
- `indeterminate`: available evidence does not settle it.

Passing unit tests is evidence that the implementation executes its declared
examples. It is not evidence that Prolog-backed memory improves agent answers.

## Evidence policy

Every observed or computed claim requires:

- a source snapshot or commit identifier;
- a dataset manifest and SHA-256 checksum;
- the exact command and configuration used;
- raw machine-readable output;
- a separate beta reproduction from a clean copy;
- an explicit comparison against the strongest declared baseline.

Model, provider, prompt version, context budget, sampling parameters, run time,
and retry policy must be recorded. Results from configurations that differ on
more than the memory mechanism cannot support a comparative claim.

Prompt versions are recorded in `.cdr/prompts/manifest-v1.json`. A run must
pin both the base turn-template hash and any provider-adapter wrapper hash;
`prompt_sha256` alone is insufficient when an adapter adds instructions or an
output contract around the base template.

## Data-use policy

- Evaluation dialogues must be synthetic or explicitly sanitized.
- `data/memory.pl` is local exploratory state and must not be copied into a
  public benchmark or external model request.
- Secrets, API keys, emails, employer-private facts, and third-party personal
  data are prohibited in fixtures and raw results.
- Raw model outputs may contain unexpected personal data and therefore remain
  local until reviewed.
- A manifest must state origin, intended use, redistribution status, and hash
  for every dataset.

## Primary decision claim

The operator-proposed claim under test is:

> Under the same model and context budget, structured claims with Prolog-based
> active-state and conflict reasoning reduce stale-or-contradictory answer
> errors relative to the strongest non-Prolog baseline.

This remains `hypothesized` until a closed CDR receipt says otherwise.

The claim is falsified for the evaluated scope if the Prolog condition fails
to improve stale-or-contradictory answer error, or if any improvement disappears
when extraction errors and context budget are controlled.

## Gate thresholds

Thresholds are pre-registered targets, not current results:

- symbolic-core correctness with gold claims: 100%;
- memory-write precision: at least 0.97;
- memory-write recall: at least 0.85;
- active-state exact accuracy: at least 0.95;
- false clarification rate: at most 0.05;
- provenance completeness for memory-backed answers: 1.00;
- stale-or-contradictory answer error: at least 50% relative reduction against
  the strongest baseline, with the absolute rate reported as well.

A miss on a threshold produces `NO-GO`, `REVISE`, or `INDETERMINATE`; thresholds
must not be weakened after inspecting results. A later wave may pre-register a
different scope and new thresholds.

## Baselines

Use the same answering model and effective context budget for all conditions:

1. recent-turn context only;
2. rolling text summary;
3. typed claims with deterministic latest-value handling but no Prolog rules;
4. typed claims plus Prolog active-state, conflict, and provenance queries;
5. condition 4 with gold claims, used only as an oracle ceiling.

## Review and independence

- Alpha authors research matter and runs the producing experiment.
- Beta independently checks falsifiability, dataset integrity, method
  conformance, citations, and reproduction from clean.
- Alpha and beta must be different fresh sessions. They may not be collapsed.
- Delta may equal gamma for this small local wave, but neither role may replace
  beta's verdict.

## Exit

The project may stop without a positive result. A `NO-GO` or `INDETERMINATE`
receipt is a valid outcome. Code optimization, ontology expansion, vector
search, and publication work are deferred until the minimum comparison yields
evidence that warrants them.

## CLP check

- Pattern: the policy tests memory usefulness, not merely Prolog execution.
- Relation: claims are bounded by source, dataset, baseline, and reviewer.
- Exit: negative and inconclusive outcomes are explicitly acceptable.
