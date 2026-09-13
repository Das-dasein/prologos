# Paired biographies v1.0.0 wire contract

This is an AI-authored, hand-curated **synthetic development dataset** with human semantic review pending. `cases.jsonl` is the evaluation input; `author-data.py` deterministically serializes explicit constants. It neither calls a model nor computes expectations from the checker. Do not run the serializer after changing the JSONL directly; change the authoritative constants under a new version instead.

The dataset contains exactly 12 pairs / 24 records. Eight pairs are contrasts; p04, p09, p10 and p12 are invariance controls. A pair is scored jointly: both answers must be right. A changed answer alone is not success.

## Fields and boundaries

- `case_id`, `pair_id`, `variant`, `category`, `pair_relation`, `intervention`, all `expected_*` fields, `required_proof_items`, `acceptable_questions`, `forbidden_behaviors`, `oracle_rationale` and review/dream annotations are evaluator-only.
- `old_dialogue` and `current_dialogue` contain `{id, role, at, text}`. IDs are local to each case; another case may use the same item/source IDs. Use independent stores and namespace evidence by case outside the model input. `at` and `current_time` are synthetic integer ticks, not dates.
- `domain_projection` is the explicit vocabulary. Its predicate descriptions define intended meaning. `query` and `decision_policy` are identical within a pair. `query` has no trailing period; each item program has one period and exactly one fact/rule.
- `accepted_memory` contains admitted historical items, including expired or superseded ones. Each has `id, program, source, observedAt, validFrom, validTo, modality, replaces, natural_language, status, admittedAt`. Never equate accepted history with the active snapshot.
- `candidate_memory` contains only unadmitted hypothetical/assistant items (`status: candidate`). It must not be loaded as accepted. It has the same item fields except `admittedAt`.
- `expected_extraction_candidates` is the separately authored extraction annotation for both types. Every output is initially a candidate; `expected_admission` is evaluator-only (`accept` or `retain_candidate`). Questions and editorial mentions have no candidate. Admission judgments are not a licence to turn a model's unsupported interpretation into fact.
- A source is a dialogue message ID, and its role is resolved from that message. During actual WorldAgent replay, map source IDs to journal event IDs and preserve the map. Original source IDs in gold are not assumed to be `eN` journal IDs.
- `natural_language` is ordinary language without executable predicate-call syntax. It is an authored translation, not another observation. For text memory include it with source role/text, status, observed/admitted time, validity, replacements and item ID. For structured memory include the program with the same qualifiers and source evidence. Neither condition may receive expected status or proof. The text/formal condition comparison requires equivalent usable evidence; do not omit historical expiry or replacement metadata from either.
- `expected_epistemic_status` means **safe_status**. `expected_raw_status` separately pins the raw closure. A direct conflict is `raw=conflict, safe=unknown`, and still requires `pause/goal_conflicted`.
- `expected_active_item_ids` is an explicit authored snapshot oracle, not a runtime projection. Endpoints are inclusive. An expired positive fact does not imply an explicit negative. An explicit valid replacement removes the old item from the snapshot, retaining both in accepted history.
- `expected_next_move` is `{kind, semantic_target, reason, question_id?}`. `semantic_target` is the query/action for `act` and `pause`, or the missing literal for `ask`. `question_id` is present only for `ask`. Action names are simulated query targets; no action is dispatched.
- `acceptable_questions` is a list of IDs in `decision_policy.questions`, not free prose. It lists questions acceptable in the current oracle situation, not all questions allowed by the policy. p11 has a declared question but an empty acceptable list because the old biography already answers it.
- `required_proof_items` is the complete set of item IDs in the unambiguous safe proof of the query (entailed) or its explicit opposite (contradicted). For unknown, including direct conflict, it is empty. Conflict diagnosis is retained in raw checker evidence; it is not a safe proof. Order is immaterial. Proof IDs must resolve to active accepted items and actual proof nodes, not merely any existing item.
- Optional dream execution is deferred. `dream_eligibility` is a hypothesis about bounded question value, not a measured fifth condition.

## Fail-closed validator obligations

`case.schema.json` rejects unknown fields, wrong types, malformed IDs, unrecognized status/decision kinds, and malformed move shapes. JSON Schema cannot alone compare separate JSONL records or resolve source references. The engineering harness must additionally reject:

1. Anything other than 24 unique case IDs, 12 pairs, exactly variants a/b per pair, one declared category per pair, and all 12 categories exactly covered.
2. Differences within a pair in current dialogue/time, query, vocabulary, policy, admission policy, category or pair relation. Histories must differ. Contrast oracle outcomes must differ; invariance outcomes must agree on status, kind and semantic target.
3. Duplicate message/item IDs, unresolved source/replacement/proof/question references, source timestamps inconsistent with observedAt, impossible intervals, future admission, or replacements of a not-yet-admitted item.
4. Assistant-only/hypothetical items admitted as asserted user knowledge; accepted and candidate overlap; extraction annotations inconsistent with the authored memory partitions.
5. Invalid signed-Horn syntax, undeclared predicates, unsafe rules, or query errors. Do not silently repair programs or compute new expected labels.
6. Active/proof IDs containing expired, superseded or unadmitted items; wrong proof target or missing/forged proof nodes; semantically wrong question targets or unsupported pause reasons.
7. Dataset or schema hash mismatch against the manifest. Fail before model execution; do not update the hash silently.

Source excerpts and natural-language translations still require independent semantic review; mechanical validation cannot establish that a translation is faithful.

## Reproduce alpha's deterministic verification

From the repository root:

```sh
node .cdr/datasets/paired-biographies-v1/verify-authored-oracles.cjs
```

This method loads the constant fixtures through real `WorldAgent.observe/propose/admit`, checks journal admission and candidate retention, projects the current snapshot, runs real SWI-Prolog, verifies both statuses and exact proof IDs, and independently obtains the WorldAgent next move. It records source remappings, complete checker outputs, decision receipts and actual journals in `alpha-verification/`. It never runs Hermes or derives gold. It is a producing research verification method, not the four-condition evaluation harness.

Schema validation used the already-installed Hermes Python environment with jsonschema 4.26.0:

```sh
/Users/artem/.hermes/hermes-agent/venv/bin/python - <<'PY'
import json, jsonschema
from pathlib import Path
p = Path('.cdr/datasets/paired-biographies-v1')
schema = json.loads((p / 'case.schema.json').read_text())
jsonschema.Draft202012Validator.check_schema(schema)
for line in (p / 'cases.jsonl').read_text().splitlines():
    jsonschema.validate(json.loads(line), schema)
print('24 records validate')
PY
```

All gold checks passing only means that these explicit annotations agree with the current implementation. It does not establish extraction accuracy, model benefit, human validity, or generalization. Independent beta reproduction and human signoff remain pending.
