# Paired biographies development protocol — v1.0.1

Changelog: v1.0.1 distinguishes curated development fixtures, extraction and
gold-memory behavioral comparisons before any model outputs are inspected.

## Question

For a fixed present conversation and decision policy, does changing only an old
biography cause the appropriate next choice? Does enforced signed-Horn checking
help relative to equivalent structured memory without checker output?

The user supplied twelve scenario classes. Twenty-four explicitly authored
records form twelve pairs. Contrast pairs require a justified change; invariance
pairs require the same correct choice despite phrasing/noise/conflict on an
irrelevant or independently bypassed path. Merely changing an answer is not a
success. All oracle decisions and proof requirements precede model execution.

## Data status

Synthetic development fixtures, explicitly authored by an AI assistant and
reviewed by an independent fresh AI session in
`.cdd/waves/paired-biographies-v1/beta-pair-semantics.md`. That review covers
the dialogue-to-formalization/oracle mapping; the live runtime audit is a
separate integrity check. Human semantic approval remains pending. No claim of
human authorship or manual human verification is permitted. These remain
candidate gold cases until accepted by the operator. Their human-readable oracle
review sheet must expose the old dialogues, identical current context,
formalization, intervention, derivation and expected behavior.

Only this synthetic dataset is model-visible. Local user memory, credentials,
unrelated repository files, expected labels, explanations, pair/category IDs and
the other variant must not be visible to the tested model.

## Measurements

1. Extraction: show the dialogue plus declared vocabulary, collect proposed
   items with cited source, modality, validity and replacements. Score against
   authored extraction annotations. All outputs remain candidates; equivalence
   beyond the supported normalizer is unresolved, never guessed by an LLM judge.
2. Memory: load explicitly accepted gold items through the actual journal
   lifecycle; retain unaccepted candidates. Test active items, raw/safe status
   and provenance with the real checker. This isolates memory/checker defects
   and provides no evidence of extraction success.
3. Behavior: fresh installed-Hermes agent for every variant and mode, using
   the same current dialogue and choice contract. Collect a structured next
   move, question target and supporting item IDs. Score kind and semantic target
   jointly, accepted question alternatives and required provenance. A candidate
   gold load is explicitly labeled `gold_memory`, not end-to-end extraction.

## Four conditions

- `no_memory`: current context, vocabulary and policy only.
- `text_memory`: ordinary natural-language memory with source status, dates and
  explicit replacements retained; no Prolog or supplied computed conclusions.
- `structured_no_prolog`: equivalent formal memory and qualifiers; no checker
  output and no execution tools.
- `checked_prolog`: the same formal memory plus a host-enforced real checker
  result and its receipt for this query and snapshot.

Checked mode measures the effect of verified evidence supplied to Hermes. It
does not measure whether Hermes spontaneously chooses to query. Production
provider auto-reflection and admission are separate from this controlled test.
Dreaming is annotated for possible follow-up, not a fifth result in this wave.

## Controls and reporting

Pin model/provider, reasoning settings, timeout/output/context limits, retry
policy and prompt version. Use full inputs without truncation; record token
usage and actual effective limits when available. Do not call unequal prompt
lengths equal observed token budgets. Mode-specific inputs necessarily differ;
the text/formal representations must preserve the same usable knowledge and
qualifiers. Record omissions and unsupported equivalences as limitations.

Errors, malformed responses and missing evidence remain in denominators.
Report extraction scores separately from memory/proof checks and behavior.
Report case accuracy, pair joint accuracy and contrast/invariance success,
with exact failures and raw evidence. Always distinguish `not_run` from failed
and from correct. Forbidden-behavior checks are limited to observable structured
output/tool evidence; do not infer an unobservable internal strategy.

No prompt or oracle tuning on observed outputs within this version. Repairs to
measurement defects require a receipt and fresh run directory; a change to gold
semantics requires a new dataset version. A single development pass is not a
general benchmark result, a clinical claim, or validation of dreaming. The
project's primary memory-benefit claim remains indeterminate without the
separate evidence and review requirements in `.cdr/POLICY.md`.

## Exit and review

Independent beta checks both the authored dialogues/oracles and the harness,
including adversarial false positives and clean reproduction. Any ambiguity
can leave a case unapproved. Negative and inconclusive results are useful.
The immediate deliverable is the executable dataset and measurement tool.
