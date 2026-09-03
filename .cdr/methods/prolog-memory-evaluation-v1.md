# PAM-C1–C4: bounded evaluation method v1

Status: `hypothesized` method adequacy; this document is a pre-registered
protocol, not a result. Scope is the 12-case synthetic pilot in
`dialogues-pilot-v1.jsonl`.

## Question and units

The unit is one dialogue history followed by one fixed query. Each case has
three to five user turns and a gold operation trace. The six registered
categories occur exactly twice: stable recall, explicit correction/supersession,
temporal change without contradiction, direct positive/negative conflict,
non-memory content, and alias/coreference ambiguity.

The protocol keeps three error sources separate. The symbolic condition gets
gold proposals; the extraction condition is scored against gold operations;
the answer conditions receive the same extracted or gold claims and are scored
against the oracle answer. A claim write is counted only when a durable fact is
explicitly asserted, attributable to the user, and sufficiently resolved.

## Representation and gold operations

Each JSONL record contains `dialogue`, `gold_operations`, and `oracle`. A
`write` operation has a typed proposal matching the implementation allowlist
(`polarity`, `relation`, `arguments`, `valid_from`, `valid_to`, `confidence`).
Dates are inclusive YYYYMMDD integers; null means the open default interval.
`supersede` records an explicit correction and its predecessor. `clarify`
means no write is permitted until the named ambiguity is resolved. `ignore`
means the turn is not durable memory (question, hypothetical, quotation, or
uncertainty). IDs in the oracle are deterministic pilot IDs, not runtime IDs.

The oracle is authored before any model output. For each case it gives the
final active claim IDs, unresolved conflict tuples, and fixed query answers.
Queries must mention at least one injected claim (directly or through a
declared rule); literal-only smoke predicates are invalid. End-to-end answer
labels and provenance requirements are in
`.cdr/results/prolog-memory-eval-v0/answer-oracle-v1.json`.
The gold-claim symbolic run must inject these operations directly, assert
`supersedes(New,Old)` for supersession operations, and compare exact sets and
provenance. This tests PAM-C1 without testing extraction.

## Conditions and baselines

Use one pinned model/provider, temperature 0 (or the provider's deterministic
equivalent), identical prompt, retry policy, and effective context-token
budget in every answering condition. The fixed values are: provider
`openai-api`, model identifier recorded by the CDS harness, temperature `0`,
one request per turn (no retries), extraction prompt `PAM-extract-v1`, answer
prompt `PAM-answer-v1`, and effective context budget `4096` tokens. Conditions
are: (B1) recent turns only;
(B2) rolling text summary; (B3) typed claims with latest-value handling but no
Prolog rules; (B4) typed claims with Prolog active-state, conflict, and
provenance queries; (B5) B4 with gold claims (oracle ceiling). Only the memory
mechanism changes. B5 is not a user-facing comparison.

For extraction, send each turn with the extraction schema and instructions,
never the gold operation or oracle. The leakage sentinel is case `stable-01`:
the model condition must not receive the strings `c_stable_01_a` or its gold
proposal; a harness aborts if either occurs in prompt/context. The budget
sentinel records token counts for each condition and rejects a run when the
maximum effective context differs between conditions.

## Scoring and pre-registered gates

Compute exact-match metrics over the 12 cases (and category-stratified values):

* symbolic-core correctness = exact active states, conflict states, and query
  answers under gold injection;
* write precision/recall = operation-level exact match, separately for write
  decision and every proposal field;
* active-state exact accuracy = exact final active IDs per case;
* false clarification rate = clarification requests on non-ambiguous durable
  turns divided by such turns;
* provenance completeness = fraction of memory-backed answers naming source
  and applicable date interval;
* stale-or-contradictory error = answer using a superseded, inactive, or
  conflicting fact when the oracle says otherwise.

For comparative scoring, select the strongest non-Prolog baseline *before*
looking at answer outputs: among B1--B3 choose the condition with the lowest
mean oracle-scored stale/contradictory error; ties are broken by lowest mean
general-answer error, then fixed order B3, B2, B1. This is a pre-registered
selection rule, not an after-the-fact choice. The harness must report all three
baseline scores and the selected baseline.

## Execution contract and sentinel behavior

The canonical run is the separately pinned CDS harness command
`node <CDS_HARNESS>/run-eval.js --config eval-config-v1.json --dataset
.cdr/datasets/dialogues-pilot-v1.jsonl --oracle
.cdr/results/prolog-memory-eval-v0/pilot-oracle.json`. The harness must record
provider/model/prompt IDs, sampling, retry policy, context token counts, raw
JSONL output, and its own commit/archive identifier. It must abort before
scoring if the stable-01 gold ID or proposal appears in a model prompt, and
reject the run if any condition's maximum effective context exceeds 4096 or
differs from another condition. No CDS harness was present in this R1 source
snapshot; therefore this contract is pinned method specification, not an
executed result, and method adequacy remains `hypothesized`/`REVISE` pending
that separate artifact.

Pre-registered targets from `.cdr/POLICY.md` are unchanged: 1.00 symbolic,
precision ≥ .97, recall ≥ .85, active-state ≥ .95, false clarification ≤ .05,
provenance = 1.00, and at least 50% relative reduction in stale/contradictory
error against the strongest baseline with absolute rates reported. Twelve
cases are a pilot and cannot support significance claims. Any missing provider
or unreproducible budget is `INDETERMINATE`; incomplete labels or harness
sentinels are `REVISE`; a protocol unable to separate the three sources is
`NO-GO`.

## Limitations

The dataset is synthetic, small, English-like Prolog atoms with no demographic
or private data; it measures protocol executability, not real-user utility.
Gold labels simplify natural-language pragmatics. The current implementation
does not itself persist supersession edges, so the symbolic oracle requires an
explicit harness assertion and is evidence about the declared protocol, not a
claim that the prototype already implements every operation. No live-model
result is claimed here.
