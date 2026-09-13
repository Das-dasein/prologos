# Independent final evidence audit v2 — PASS

2026-09-10. Scope: integrity and reproducibility of the completed local synthetic
Luna pilot. **PASS for result integrity; memory/Prolog benefit remains
indeterminate.** No new model calls, implementation/gold changes, commits,
subagents or global configuration writes by beta. This does not approve a
scientific, legal, medical or production-use claim.

The producer report is terminal `completed`: **96 behavior calls + 24 separate
extraction calls**, all runtime `ok`; **24/24 real gold-memory checks pass**.
No incomplete calls or missing observations were removed from denominators.
All 96 behavior responses satisfy the declared JSON shape/types. Failed strict
responses below are semantic-field, serialization or receipt failures rather
than process/JSON failures.

## Independent integrity checks

`audit.cjs` loads the run's frozen project sources, copies the hash-verified
candidate gold/schema into its isolated replay-source directory, and replays
scorers without any model call. It checks only report-listed completed entries;
aggregates were generated only after terminal status and all 120 entries existed.

**120/120 pass**, with no outstanding integrity findings:

- Frozen requested system/user/prompt version equal the intended mode projection.
  Actual AIAgent messages, logical request and physical HTTP instructions/input
  equal that same pair. No extra profile/history/other-variant/oracle data enters
  the first three modes; checked mode alone receives its actual checker receipt.
- Exactly one physical dispatch per call, zero denied retries, zero exposed tools;
  completed physical/provider response. Additional wire inspection finds no
  previous_response_id/conversation/unlisted request field and no tool-call
  output. Every request has store=false.
- Requested, physical-wire and provider-returned model is gpt-5.6-luna; requested
  low reasoning and outgoing low reasoning agree. All 120 sessions, process IDs,
  temporary homes and workdirs are distinct.
- Runtime fingerprints equal the run-start pin. The run source manifest, runtime
  fingerprint and dataset hash also equal independently reviewed v2
  (`reviewed-vs-run.json`). No duplicate output JSON keys occur in all 120 outputs.
  Frozen source, request and
  per-adapter evidence hashes verify. Case, snapshot, checker input/interpreter
  and journal hashes verify for all 24 memory replays; statuses/proofs match gold.
- Physical SSE completed text reconstructed independently from both
  response.output_item.done and response.output_text.done matches raw API and
  Hermes final_response. Physical/API/Hermes usage counts agree.
- Recomputed strict behavior and extraction metrics equal stored metrics.
  A second complete audit in `reproduction/` gives identical integrity results,
  component summaries, extraction totals, metadata distributions and usage.
  SWI error text contains nondeterministic stream addresses, which do not affect
  score equality. `reproduction-match.json` records this comparison.

## Frozen results and diagnostic components

Counts below are out of 24 cases. “Move” is the prospectively defined exact
kind + target + allowed question ID; it is not a post-hoc paraphrase judge.

| Mode | Strict response | Move | Safe status | Proof IDs | Strict pair joint |
|---|---:|---:|---:|---:|---:|
| no_memory | 3/24 | 6/24 | 8/24 | 8/24 | 1/12 |
| text_memory | 22/24 | 23/24 | 23/24 | 24/24 | 10/12 |
| structured_no_prolog | 22/24 | 23/24 | 23/24 | 24/24 | 10/12 |
| checked_prolog | 19/24 | 23/24 | 23/24 | 24/24 | 8/12 |

Move/status pair joint counts are 1/12 for no-memory and 11/12 for each memory
mode; proof pair joint is 1/12 and 12/12 respectively. Strict contrast pairs:
0/8, 6/8, 6/8, 4/8. Strict invariance pairs: 1/4, 4/4, 4/4, 4/4. The latter
includes p09, whose behavioral inputs drop the intervened distractors; it must
not be reported as four measured behavioral historical-robustness interventions.

The complete per-call component flags and exact outputs are in `audit-final.json`.
The memory-mode strict failures separate as follows:

| Case/mode | Concrete discrepancy | Affected frozen components |
|---|---|---|
| p03_b, all three memory modes | Output safe epistemic_status=`conflict`; required safe status is `unknown` while raw status is conflict. Pause and conflict reason are correct. | Status |
| p08_b, text and structured_no_prolog | Correct ask/q_approve, but semantic_target is the exact declared Russian question text instead of `approve(cobalt)`. | Move target serialization |
| p07_b, checked_prolog | Correct ask/q_available, but semantic_target is the declared question text instead of `available(saffron)`; receipt null. | Move target serialization + receipt |
| p01_a and p06_b, checked_prolog | Correct move, status and proofs; receipt null. | Receipt |
| p03_a, checked_prolog | Correct move, status and proof; wrong receipt hash. | Receipt |

Thus checked mode has four receipt failures, one also involving target
serialization, and the shared p03_b status error. The target errors do not show
a different conceptual question: the authored question ID and its exact text
are present. The frozen exact target metric remains false; no equivalence
allowance was added. Proof IDs are correct in all 72 memory-mode responses.
No failed receipt or status is described as an incorrect action choice.

## Extraction diagnosis remains separate

**16/24 exact**, **41/57 candidate items matched**, **57 predicted and 57
expected**. All **16 invalid predicted items** remain in the denominator;
micro precision=recall=41/57≈0.7193. This is extraction into unaccepted candidates,
not accepted-memory behavior or an end-to-end result.

All eight failed extraction cases contain an invalid signed-Horn rule
representation. Fourteen invalid items use an arrow operator outside the trusted
profile; two use `&` and produce an original parser error. Calling all fourteen
arrow terms ordinary Prolog syntax errors would be imprecise: they parse as an
unsupported operator expression rather than the required Horn clause.

| Case | Matched / expected | Invalid predicted | Diagnosis |
|---|---:|---:|---|
| p01_a | 0/1 | 1 | consent → publish serialized with `->`, outside profile |
| p01_b | 1/3 | 2 | Both rules use `->`; archive fact matches |
| p04_a | 3/7 | 4 | Four rules use `->`; three signed/audit facts match |
| p04_b | 3/7 | 4 | Same representation failure; three facts match |
| p05_a | 1/2 | 1 | Old rule uses `->`; reviewed fact matches |
| p05_b | 1/3 | 2 | Old rule `->`, new rule `& ... ->`; additional interval/NL discrepancies |
| p10_a | 1/2 | 1 | Packed→ship rule uses `->`; packed fact matches |
| p12_a | 0/1 | 1 | Conjunctive rule uses `& ... ->`, parser error |

In p05_b, the old rule gets validTo=19 instead of the authored historical
validTo=null with retirement expressed by the new item's replaces link. This is
an additional history/qualifier contract mismatch, even if both encodings remove
the old rule at current time. The new rule's NL rendering says review/signature
are **necessary**, whereas the source states their conjunction is **sufficient**.
That qualitative NL mismatch is outside the deterministic score and must not be
called a scored syntax-only success under an imagined repair.

No additional source ID, observedAt, modality, status or replacement-target
mismatch was found in the explicit beta mapping of these eight cases; no case
omitted a predicted item by count. All 41 valid items match. Invalid items do not
become “semantically correct” merely because an intended implication is legible.
`extraction-diagnosis.cjs/.json` preserve the explicit explanatory mappings and
raw mismatches, with no mutation or rescoring.

## Settings and interpretation boundary

All 120 outgoing requests omit temperature, top_p and max_output_tokens. The
retained **provider terminal metadata**, newly inspected here, reports for all
120: temperature=1, top_p=0.98, reasoning effort=low (mode standard, summary
detailed, context all_turns), max_output_tokens=null, truncation=disabled and
service_tier=default. Requested reasoning summary is auto; reported summary is
detailed. These are distinguished in `settings` per call and the metadata
summary. Provider metadata is not independent proof that a resource ceiling was
enforced. The requested 4096 token cap remains absent; no equal effective token
budget is claimed.

Recorded usage: 111,892 input + 18,852 output = **130,744 total tokens**, of which
9,209 output tokens are reported reasoning tokens; cache-read=0. Per-mode input
sums differ: text 24,000, structured 23,490, checked 32,519. Do not attribute this
comparison to equal prompt length or equal measured context budgets.

For this one authored development pass, the primary structured-vs-checked
comparison shows **no gain in the frozen move count** (23/24 each); strict
response accuracy is lower with checked evidence, largely because of its extra
receipt obligation. This is a bounded observation, not a general negative or
positive efficacy conclusion. Cases are AI-authored, human review pending;
no-memory intentionally loses historical knowledge; p09 distractors are measured
only in extraction; provider retrieval/admission, extracted-memory end-to-end,
dreaming, clinical/legal utility and external-world truth were not tested.

## Reproduce

Original producer report bytes are preserved in producer-final-report.json.
Run the script into a **new** audit directory to preserve existing audit outputs:

```sh
PAIRED_AUDIT_OUT=/tmp/paired-live-audit-fresh node /Users/artem/Documents/code/prolog-agent-memory/reports/paired-biographies-v1/independent-live-audit-v2/audit.cjs
```

The script uses frozen run sources and the audit's archived candidate gold;
Hermes model calls are never made. Source-script SHA-256 and reproduced aggregate
match are recorded in reproduction-match.json. The initial partial-76 parser
false positives and their correction are transparently documented in
`audit-development-notes.md`; they are not outstanding pilot failures.
