# Offline evaluator v3

`offline-eval-v3.js` replays a frozen aggregate without importing a provider or
calling a model. It reads the archived raw manifest only to verify the raw
envelopes referenced by the aggregate. The historical aggregate, raw files,
dataset, and oracle are never rewritten.

Run the default frozen replay:

```sh
npm run eval:offline:v3
```

Explicit inputs are available for a clean-copy replay:

```sh
node offline-eval-v3.js \
  --aggregate=reports/live-20260905-152059/aggregate.json \
  --dataset=.cdr/datasets/dialogues-pilot-v1.jsonl \
  --oracle=.cdr/results/prolog-memory-eval-v0/answer-oracle-v1.json \
  --raw-manifest=reports/live-20260905-152059/manifest.json \
  --expected-run-id=20260905-152059 \
  --source-snapshot=offline-eval-v3.js \
  --output=reports/live-20260905-152059/replay-v3.json
```

The evaluator binds the aggregate and manifest to an expected run identity.
Relabelling `manifest.run` is rejected; when a future aggregate carries its own
`run_id`, it must agree with the expected identity. If a referenced raw file is
missing, the replay is emitted with `replay_status: indeterminate` and
`raw_integrity.status: indeterminate`; it is never silently counted as a pass.
Undefined metric coverage (zero denominator) is `null`, distinct from zero
coverage with eligible observations.

The artifact is versioned as `offline-eval-v3` and marks itself
`post_hoc_computed_historical_replay`. Every case retains evidence references,
legacy string comparison, deterministic content rubric, provenance result, and
stale/conflict result. Extraction uses one-to-one matching on source turn,
relation, arguments, polarity, modality, and interval; claim IDs are links and
are not correctness keys. Missing or unusable provenance is `unknown`.

This is an engineering replay of already inspected outputs. The content rubric
is deterministic and case-scoped; it is not an LLM judge. The artifact cannot
support a claim that B4 improves model answers. A fresh beta must verify the
inputs, fixtures, deterministic hashes, and cross-run rejection.

Validate the replay artifact against the checked-in Draft 2020-12 schema with
the existing pinned project dependency (`zod@4.5.4`):

```sh
npm run test:offline-eval:schema
```

The gate checks both a valid replay and rejection of an unexpected top-level
field. It is an engineering schema check, not evidence for PAM-C1.
