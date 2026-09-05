# CDS handoff contract: PAM comparative harness v2

This is an engineering handoff from CDR α. It is a contract for a separate
CDS cycle; it is not a CDR result and does not authorize a receipt. The CDS
cycle must pin its own source commit or immutable archive and return its raw
artifacts for fresh independent CDR β review.

## Required input contract

The harness accepts one immutable configuration and the registered dataset and
answer oracle. The configuration must contain:

```text
protocol_version: prolog-memory-evaluation-v2
source_commit: 40-hex Git commit or immutable archive ID
dataset_sha256, oracle_sha256
trusted_memory_sha256, trusted_domain_sha256
provider, model, sampling, retry_policy
extraction_prompt_id, extraction_prompt_sha256
provider_adapter_prompt_id, provider_adapter_prompt_sha256
answer_prompt_id: PAM-answer-v1
answer_prompt_sha256
serialization_version, truncation_policy
effective_context_budget_tokens: E
conditions: [B1, B2, B3, B4]
```

`E` is chosen before any model output is inspected. It may be greater than
4096. The harness must measure the effective budget on every extraction,
summary, and answer request; it must write per-request values and reject the
run unless every B1–B4 condition has the same measured budget `E`. A config
field without measured per-request evidence is insufficient.

## Required execution behavior

For each of the 12 cases and each B1–B4, the harness must:

1. build the condition-specific memory context from the dialogue prefix;
2. run the extraction/summary operation required by that condition;
3. call the answering model with the fixed query and condition context;
4. retain raw provider envelopes, prompts or prompt hashes, usage, and outputs;
5. score extraction and final answer against the registered oracles; and
6. emit a case record that names the source claim IDs, source turns, intervals,
   stale/conflict classification, and provenance outcome.

The condition implementation obligations are exact:

- B1 materializes the recent-turn window only;
- B2 materializes and hashes rolling summaries and passes no typed claims or
  Prolog output;
- B3 materializes typed extracted claims and a deterministic latest-value /
  supersession state without consulting Prolog;
- B4 materializes the same typed extraction envelope, explicit revision edges,
  Prolog active/conflict/provenance results, and passes those results to the
  answering model;
- B5, if implemented, is a separate gold-injection symbolic ceiling and must
  not be presented as B1–B4 execution.

No condition may implement its result by returning `[]`, filtering the gold
oracle answers, or using a query binding as if it were the final answering
model response. A condition record with no answering-model request is
`unavailable` and cannot enter comparative scoring.

## Fail-closed diagnostics

Before every provider call, inspect the assembled prompt for private markers
and stable-01 gold IDs/proposal content. Any match aborts the run and writes a
diagnostic failure; the provider call must not proceed. Verify input hashes,
source identity, registry identity, dataset case count/category counts,
provider model identity, usage reconciliation, and trusted-source immutability.
Reject missing raw outputs, missing usage, mismatched prompt hashes, retries
outside the pinned policy, and any B1–B4 budget inequality. The harness must
also reject an output that labels a condition as complete when any case lacks
an extraction record or final answer record.

## Required output contract

Emit one immutable JSON artifact per condition and one aggregate manifest. Each
case record must include at least:

```text
case_id, condition, dialogue_hash
turn_outputs: [{turn, prompt_sha256, output, usage, raw_output_ref}]
memory_context: {kind, sha256, source_refs, serialized_bytes}
answer_request: {prompt_sha256, query, usage, raw_output_ref}
answer: {text, provenance_claim_ids, source_turns, intervals}
scoring: {extraction, answer_exact, general_answer_error,
          stale_or_contradictory_error, provenance_completeness}
evidence_boundary: live_model | gold_oracle | unavailable
```

The aggregate must include B1–B4 scores, the measured `E` for every
condition, all prompt/config/dataset/source hashes, the selected strongest
non-Prolog baseline, and a machine-readable list of any failed or unavailable
cases. It must preserve raw output references rather than only dashboard or
narrative summaries.

## CDS acceptance evidence

CDS must provide tests that prove each condition has a distinct context path,
that B4 is the only live condition consulting Prolog, that each condition
calls the answering model, that leakage and unequal-budget fixtures fail
closed, and that a clean archive reproduces the aggregate hashes. These tests
establish harness behavior; they do not establish PAM-C1. The resulting
artifact is admissible to CDR only after a fresh independent β re-audit.
