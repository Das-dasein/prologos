# Product extraction v4/v5 paired control v1

This fresh paired control compares the current v4 extraction prompt with the
experimental policy-bound v5 prompt. Twenty new messages and their gold labels,
both schemas, both prompts, the alternating condition order, collector, and
verifier were frozen before 40 Luna calls. Neither condition could write
memory.

Primary frozen result:

| Metric | v4 | v5 |
| --- | ---: | ---: |
| Decision accuracy | 11/20 | 19/20 |
| Write-boundary accuracy | 16/20 | 19/20 |
| Exact semantic cases | 11/20 | 19/20 |
| Raw harmful writes | 1 | 1 |

V5 corrected eight v4 cases with no reverse regression. Three were useful
registered writes that v4 over-clarified: a habitual coaching role, a direct
employment contract, and an ordinary ASCII organization identity. Five were
one-time events that v4 preserved as ontology candidates while v5 followed the
product control's `ignore` labels. The latter improvement depends on the
control's memory-worthiness policy; those ontology candidates were quarantined
and did not constitute harmful writes.

Both versions failed the same identity case. For `Я работаю в Кэндзи.`, each
emitted `works_at(user,kendzi)` instead of requesting clarification. Thus the
policy prompt substantially improved disposition conformity and useful recall
on this small set, but did not improve the observed harmful-write count.

After seeing the live failure, a separate deterministic validator was written
to reject a normalized identity when its evidence contains non-ASCII letters
and the proposed non-lexical atom has no literal source binding. A clearly
marked post-hoc replay blocked `pv-20` in both conditions, passed every other
write, reduced eligible harmful writes from one to zero, and blocked zero
correct writes. This replay is diagnostic evidence only: the validator was
authored after the wave and was not activation evidence. A later fresh identity
control tested the gate before it was activated through a versioned admission
policy.

Limits:

- The control is hand-authored, small, and mostly English.
- Its one-time-event `ignore` labels encode a product memory policy that is not
  fully formalized by the predicate-grounding policy.
- Exact results do not establish general extraction accuracy or CDR.
- V5 remains experimental. Product extraction continues to use v4 and explicit
  admission; the later admission-policy v1 adds the identity gate to the
  existing validator-v2 pipeline.

Artifacts:

- Frozen fixture SHA-256: `3be7ff6e8bbbcc4cde8f47b6b912ef69aacb8e7898a891fdd5d981474fd1a9f9`
- Frozen gold SHA-256: `a0468d73b9d768bcccfa01eb7b5c2abd87fe36bbeb1ebee041268c776020d62f`
- Live report SHA-256: `84b0604373293b57a92b992ac6a33a7cefedf5b4500f91a90a72938fc69a68dd`
- Post-hoc identity replay v3 SHA-256: `7ee9e525d05a73168984d38dde09d099be95fb52f1353bd774e0f069880cf071`
- Raw artifacts: 120 files.
- Provider usage: v4 reported 395,418 input tokens, including 307,200
  cached, and 4,793 output tokens; v5 reported 407,778 input tokens, including
  80,896 cached, and 5,156 output tokens.

Replay without provider calls:

```bash
node verify-product-extraction-v4-v5-paired.cjs \
  reports/product-extraction-v4-v5-paired-control-v1/luna/report.json \
  .cdr/waves/product-extraction-v4-v5-paired-control-v1/fixture.jsonl \
  .cdr/waves/product-extraction-v4-v5-paired-control-v1/gold.jsonl

node replay-product-extraction-v4-v5-policy-identity.cjs \
  reports/product-extraction-v4-v5-paired-control-v1/luna/report.json \
  .cdr/waves/product-extraction-v4-v5-paired-control-v1/fixture.jsonl \
  .cdr/waves/product-extraction-v4-v5-paired-control-v1/gold.jsonl \
  reports/product-extraction-v4-v5-paired-control-v1/luna/policy-identity-replay-v3.json
```
