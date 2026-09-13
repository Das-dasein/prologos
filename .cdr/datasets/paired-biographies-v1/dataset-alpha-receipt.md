# Dataset alpha receipt — paired biographies v1.0.0

Status at the time of this alpha handoff: **ready for independent beta review; human review pending**. This is alpha's research handoff, not a gamma close-out or a validated typed CDR transmission receipt. Subsequent independent AI semantic review is recorded in `.cdd/waves/paired-biographies-v1/beta-pair-semantics.md`; human review remains pending.

## Matter and provenance

Exactly 12 explicit pairs / 24 variants are stored in `cases.jsonl`, with complete authoring constants in `author-data.py`. All twelve requested categories are covered. p04, p09, p10 and p12 are invariance controls; the other eight are contrasts. Source dialogue IDs, candidate versus accepted states, timing, supersession, active IDs, expected raw and safe statuses, next move and proof IDs are explicit.

Origin: synthetic AI-authored, manually curated by this alpha session. No generator/model API call was made. Gold status, move, active-set and proof constants were authored before checker execution and were not computed from the checker. No human signoff is claimed. External personal data and private memory were not used in the fixtures.

Dataset SHA-256: `8ced0edd45ca32c3843fcb0a8922a0f3c53635a8c903dedd834a0a86fa39a1e2` (142656 bytes). The manifest pins the exact source snapshot, schema and methods. Repository baseline: `f9f1293b69d1c84862bd0bce421cdad4b6e618a0`; the checkout is dirty, so individual source file hashes and retained snapshot copies, not that commit alone, identify the world implementation tested.

## Deterministic verification

`computed` producing self-check: all **24/24** authored active sets, raw/safe statuses, safe proof item sets and next moves agreed with the actual implementation. Source links resolved; the real journal retained rejected candidates without admission and retained superseded/expired accepted history while excluding it from the current snapshot. No semantic discrepancy between the proposed expectations and checker outputs was observed. These are alpha observations awaiting independent reproduction.

Command: `node .cdr/datasets/paired-biographies-v1/verify-authored-oracles.cjs`.

The method replays actual `WorldAgent.observe/propose/admit`, calls SWI-Prolog through `world/checker.js`, then exercises the actual `WorldAgent.step` with the common declared policy. It records complete checker closures/plans/evidence, decisions, source-ID mappings and per-case actual journals in `alpha-verification/`. It never computes or replaces gold expectations, runs Hermes, or implements the production four-mode harness.

`computed` schema self-check: Draft 2020-12 schema structure and all 24 records validated with existing `jsonschema 4.26.0` in the installed Hermes Python environment. The exact command is in `WIRE.md`. Pair equality and cardinality, explicit contrast/invariance behavior, source/timing/admission references, active sets and proofs also passed the producing verification. The engineering author remains responsible for the full fail-closed runtime validator and adversarial mutation suite.

`computed` long-history size: each p09 history has **33 messages / 5100 text characters**. This includes 28 substantive editorial distractors plus early target and near-miss positive, negative, expired and hypothetical facts for distinct objects. Variant B reverses the distractor order while retaining their semantics. No history truncation is used in the dataset.

## Review surfaces and limitations

- `case.schema.json`: versioned closed-record JSON Schema.
- `WIRE.md`: exact meanings, mode visibility rules, cross-record validator obligations and reproduction commands.
- `oracle-review.md`: complete dialogues, natural-language/program mappings, lifecycle qualifiers, interventions, explicit oracles and human review checkboxes.
- `manifest.json`: byte hash, origin, intended use, redistribution and review status, source snapshot/method refs.
- `alpha-verification/results.json`: all actual gold checker and next-step outputs.

`indeterminate`: whether memory improves Hermes decisions. No Hermes call or comparative condition run occurred in this dataset-authoring session. Passing authored examples is not extraction evidence or a positive scientific result.

Limitations: AI-authored synthetic candidate gold; human semantic review pending; independent fresh beta not yet run; 12 deliberately selected scenario classes are not a representative statistical sample; fixed explicit vocabulary; unknown is open-world ignorance, not negative; conservative safe closure follows this interpreter's behavior. Dream eligibility is only an annotation for a deferred follow-up. There is no claim about unobservable internal model behavior.

No commits, remote side effects, global configuration changes or changes outside the assigned dataset directory were made. No subagents were used by this alpha.

## Learning / epsilon observation

A source-aware dataset must preserve three distinct objects: dialogue-to-candidate annotation, admitted historical memory and active safe proof. Conflating them would make rejected assistant text, expired facts or retired rules appear to be extraction or reasoning successes. The wire contract now names each boundary explicitly; independent beta must audit the natural-language mappings as well as reproducing execution.
