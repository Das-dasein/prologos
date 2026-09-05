# α implementation report: offline evaluator v3

Date: 2026-09-05. Role: CDD α implementation. This report is an engineering
handoff, not a CDR verdict and not a β review.

Implemented files:

- `offline-eval-v3.js` — provider-free frozen replay scorer;
- `schemas/offline-eval-v3.schema.json` — artifact contract;
- `test-offline-eval-v3.js` and `test-fixtures/offline-eval-v3-sentinels.json` — independent deterministic sentinels;
- `docs/offline-eval-v3.md` — command and boundary documentation;
- `reports/live-20260905-152059/replay-v3.json` — new versioned replay artifact;
- `package.json` — `eval:offline:v3` and `test:offline-eval:v3` commands.

Command:

```sh
npm run eval:offline:v3
```

Tests:

```text
npm run test:offline-eval:v3  PASS
npm test                       PASS
npm run test:pilot             PASS
```

The replay covered 12 cases in each of B1, B2, B3, and B4. The output hash is
`90451653463defc319fa0cab67ebbcb1009660500a92e45f502f421f79abf57e`. The raw
manifest contains 195 entries; all referenced archived raw files were present
and all hashes matched. No provider, network, retry, or model call occurred.

The v3 result retains legacy scores and emits separate deterministic content,
provenance, stale/conflict, and extraction diagnostics. Extraction matching is
one-to-one by source turn, relation, arguments, polarity, modality, and
interval. Runtime claim IDs are provenance links only. Missing answer
provenance is `unknown`, and no claims are reconstructed from context.

Observed replay coverage summary (computed from the frozen artifact):

| condition | content pass/fail/unknown | provenance pass/fail/unknown | stale/conflict pass/fail/unknown |
|---|---:|---:|---:|
| B1 | 5/7/0 | 4/0/8 | 9/3/0 |
| B2 | 5/7/0 | 4/0/8 | 9/3/0 |
| B3 | 8/4/0 | 4/0/8 | 11/1/0 |
| B4 | 6/6/0 | 4/0/8 | 11/1/0 |

These are post-hoc computed diagnostics, not a new model run and not evidence
of B4 superiority. Free-text content uses a deterministic case rubric; an
LLM-as-judge is deliberately absent. The old aggregate, dataset, oracle, and
raw envelopes were not modified. The exact source executed by the historical
run remains unknown. A fresh β must validate the clean replay, schema,
cross-run isolation, and all sentinel cases before any CDR disposition.
