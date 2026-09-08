# Transport classification amendment, before paired verdict collection

The first three completed formalization calls exposed a recorder defect:
Codex emits a benign `item.completed` of type `error` reporting shortened skill
descriptions. The strict non-message event gate incorrectly classified that
exact notice as a tool event. The model returned complete programs; the
producer consequently skipped their verdicts.

The amendment accepts only that exact known startup notice. Commands, tools,
unknown errors and malformed JSONL remain invalid. Original raw files and
receipts remain unchanged. The original producer may finish its frozen run.
The amended collector imports completed stages verbatim, retains the original
receipt hash and error, and separately records the classification correction.
Any verdict stages already produced are also imported rather than repeated.
Only absent verdict stages are run. No formalization is regenerated, no
prompt or selected case changes, and the total number of unique scheduled
model stages remains at most 90.

This is a post-start recording repair, not a model repair. Its timing and the
two manifest hashes must accompany any result. It does not convert this
diagnostic into a pre-registered confirmatory or independent CDR result.

```sh
node run-luna-thirty-paired.js .cdr/waves/luna-thirty-paired-v1/manifest-transport-r1.json .cdr/waves/luna-thirty-paired-v1/raw-r1-verdicts
```
