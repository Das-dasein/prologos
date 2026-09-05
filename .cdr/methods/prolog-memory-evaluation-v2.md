# PAM-C1–C4: prospective comparative evaluation method v2

Status: prospective protocol amendment, effective for a future unexecuted
comparative run only. This version supersedes the execution contract in
`prolog-memory-evaluation-v1.md`; v1 and all previously reviewed artifacts are
retained as historical records. In particular, the saved B4 artifact is not
retro-validated, re-scored, or used as v2 evidence.

## Amendment record

On 2026-09-05 the operator removed the absolute `max_context_tokens=4096`
ceiling for the next correct comparative run. The comparability invariant is
unchanged and is stronger than the old ceiling: B1, B2, B3, and B4 must use
the same *actually measured* effective context budget `E`, recorded in every
condition artifact and checked by the harness before scoring. `E` must be
selected and pinned before any model output is inspected. A missing, inferred,
or unequal `E` is a failed budget sentinel and leaves the wave `REVISE` or
`INDETERMINATE`; it does not justify substituting a label from configuration.

No threshold, category, baseline-selection rule, claim ID, or claim meaning
is changed by this amendment. The amendment is prospective because the prior
B4 output has already been inspected.

## Canonical claim ledger

The IDs and meanings below are copied from `.cdr/claims/open-claims.md` and
are authoritative. They correct the stale mapping in the historical
`alpha-report.md` without rewriting that artifact.

| ID | Meaning | Current status and evidence boundary |
|---|---|---|
| PAM-C1 | Prolog-backed structured memory reduces stale-or-contradictory answer errors relative to the strongest non-Prolog baseline under a fixed model and context budget. | `hypothesized`; no complete B1–B4 answering-model comparison exists. |
| PAM-C2 | The symbolic layer is deterministic and correct when supplied gold claims. | `hypothesized` as a general claim; the independent B5 review supports only a bounded 12-case observed slice. |
| PAM-C3 | LLM formalization is the dominant residual error source after the symbolic core is correct. | `hypothesized`; blocked until extraction and answer attribution are executed. |
| PAM-C4 | The repair loop can resolve explicit corrections without retaining the superseded fact as a live conflict. | `hypothesized`; the registered pilot has no executed repair-loop evaluation. |

These statuses do not authorize a CDR receipt. The B5 slice is evidence about
the bounded symbolic procedure, not evidence for PAM-C1, PAM-C3, or PAM-C4.

## Units and common controls

The unit remains one of the 12 synthetic dialogue histories followed by one
fixed query and one final answer request. Every condition uses the same
provider, model, sampling parameters, retry policy, answer prompt, dialogue
order, query, and case set. Only the memory mechanism and its resulting
context may differ. Extraction and answering calls are recorded separately.

The run configuration must pin:

- source commit and dependency/archive identity;
- dataset, oracle, trusted `memory.pl`, and trusted `domain-rules.pl` hashes;
- provider, exact model identifier, temperature, retry policy;
- extraction prompt ID/hash and provider-adapter prompt ID/hash;
- answering prompt ID/hash (`PAM-answer-v1`), serialization version, and
  truncation policy;
- the pre-run effective context budget `E` and its measurement definition.

The leakage sentinel must inspect every model prompt, including extraction,
summary, and answering prompts. If `c_stable_01_a`, `c_stable_01_b`, or the
stable-01 gold proposal appears, the run aborts before that provider call.
Provider usage must include input, output, and total tokens with a reconciled
sum. The harness records the measured effective budget for each request and
rejects the comparison unless the B1–B4 maxima and the configured `E` agree
exactly. The old value 4096 is not a default or a hidden fallback.

## Conditions

Each B1–B4 condition must run all 12 dialogues, produce a final answer from
the answering model, and retain raw machine-readable outputs. A condition
label without these artifacts is `unavailable`, not a score.

- **B1 recent turns only.** The answering model receives the registered recent
  turn window and query. It receives no rolling summary, typed claim list, or
  Prolog result. The exact window and serialized prompt are recorded.
- **B2 rolling text summary.** The answering model receives the deterministic
  registered rolling-summary artifact plus the query, and no typed claims or
  Prolog result. Each summary update, input turns, hash, and final prompt are
  recorded. A label or a post-hoc filtered oracle answer is not a summary.
- **B3 typed claims without Prolog.** The extraction model produces typed
  claims; a pinned non-Prolog state reducer applies the registered
  latest-value and supersession handling; the answering model receives that
  typed state and query. The reducer output and the answer prompt are
  recorded. It must not call Prolog or silently substitute oracle claims.
- **B4 typed claims plus Prolog.** The extraction model produces the same typed
  claim envelope; the registered Prolog layer receives those claims and
  explicit revision edges; the answering model receives the query result,
  active-state/conflict state, and provenance. The Prolog query, returned
  bindings, and final answer call are recorded. A query-only result is not a
  final answer evaluation.
- **B5 gold claims.** B5 remains a separate oracle ceiling. It injects the
  registered gold operations and checks the symbolic active/conflict/query/
  provenance result. It is not a user-facing baseline and does not replace
  B1–B4.

The strongest non-Prolog baseline is selected only after all B1–B3 runs are
complete, using the pre-registered order: lowest stale-or-contradictory error,
then lowest general-answer error, then fixed B3/B2/B1 order. The selection is
reported together with all three baseline scores.

## Answer evaluation

The answering model must be called once per case and condition with the pinned
answer prompt. Its raw response, usage, assembled prompt hash, and memory
context artifact are retained. The answer oracle in
`.cdr/results/prolog-memory-eval-v0/answer-oracle-v1.json` supplies the
acceptable fact or clarification/no-fact contract. The scorer reports, with
numerator and denominator, answer exactness, stale-or-contradictory error,
provenance completeness, and general-answer error. It must classify an answer
using the oracle's source claim IDs, source turns, and inclusive intervals;
string similarity alone is not an answer oracle.

The extraction scorer separately reports operation decision, proposal-field
accuracy, precision/recall, false clarification, and unsupported assertion
rates. Symbolic-core scores are reported separately from extraction and final
answer scores, so a B4 answer error cannot be silently attributed to Prolog.

## Gates and limitations

The thresholds remain those in `.cdr/POLICY.md`: symbolic correctness 1.00,
precision at least .97, recall at least .85, active-state accuracy at least
.95, false clarification at most .05, provenance completeness 1.00, and at
least 50% relative stale-or-contradictory error reduction against the selected
baseline, with absolute rates reported. The 12-case pilot remains unsuitable
for significance or product-generalization claims.

The current repository contains a bounded symbolic B5 harness and an
extraction-oriented `pilot-runner.js`; it does not yet satisfy this v2
contract. The missing implementation is CDS matter and is handed off in
`.cdr/waves/prolog-memory-eval-v0/cds-handoff-contract-v2.md`.
