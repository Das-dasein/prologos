# Product extraction v5 identity control v1

This fresh control was frozen after the deterministic policy-identity validator
was implemented and before 16 Luna calls. All messages are Russian. Ten cases
license writes; six use a Cyrillic form for an identity-typed argument and
require clarification until an alias is admitted. Translated role kinds,
concepts, and common things are included as false-block controls.

The v5 extractor alone scored 11/16 decisions and exact cases:

- All 10 expected writes were exact.
- It requested clarification for 1/6 unadmitted identities.
- It wrote the other 5/6 as Latin atoms: `kendzi`, `moscow`, `sorbonne`,
  `piton`, and `rust`.

The frozen deterministic gate then produced 16/16 final gate decisions. It
blocked all five harmful writes, passed all ten correct writes, and blocked
zero correct writes. The extractor's one clarification remained non-writing.
Literal Latin names inside Russian messages passed. Russian translations of a
role kind (`mentor`), a concept (`temporal_logic`), and common things (`tea`,
`hammer`) also passed because the gate applies only to identity-typed arguments:
`person`, `organization`, `place`, `technology`, and `project`.

This is fresh evidence for the bounded identity gate, not for autonomous
admission or general multilingual normalization. The examples are hand-authored
and cover one model and one call per case. After this result, the gate was first
activated for product v4 through
[admission policy v1](../extraction-admission-policy-v1/RESULTS.md), then retained
when the product moved to v5 under
[admission policy v2](../extraction-admission-policy-v2/RESULTS.md). Receipt v2
records the schema-specific policy identity; explicit user approval remains
mandatory.

Artifacts:

- Frozen fixture SHA-256: `aec9eee2c9f34a7f1f66a08e29619a475c6afc920cae216941d1f5e47c9dc9ee`
- Frozen gold SHA-256: `b1cdbbdc5e4c75aea5fdd3c462ffbb0acb622b5d5096d7409957942e7103c074`
- Live report SHA-256: `038bc171fbb310676784bb5c39bc6eed27d2dce4521719b5b7a0d6b37f4c48cf`
- Raw artifacts: 48 files.
- Provider usage: 326,201 input tokens, including 242,688 cached, and 5,117
  output tokens.

Replay without provider calls:

```bash
node verify-product-extraction-v5-identity-control.cjs \
  reports/product-extraction-v5-identity-control-v1/luna/report.json \
  .cdr/waves/product-extraction-v5-identity-control-v1/fixture.jsonl \
  .cdr/waves/product-extraction-v5-identity-control-v1/gold.jsonl
```
