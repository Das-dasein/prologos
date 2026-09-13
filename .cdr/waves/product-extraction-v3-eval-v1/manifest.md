# Product extraction v3 evaluation v1

Status before provider output: frozen nine-call diagnostic.

## Immutable inputs

- Source commit: `f9f1293b69d1c84862bd0bce421cdad4b6e618a0` with an intentionally dirty research worktree.
- Visible fixture SHA-256: `aaa39dc6f6766d4bda081f46b5df65315b5caa0c635bd9d0a4809a8f51df2f9e`.
- Existing annotation gold SHA-256: `7cf87a0f2a7b7f101872364c16d505e8c948825ac060fa2fe2bd5a8a004edf66`.
- Product schema canonical SHA-256: `1b93c9c4889585c6dee5421c07e3907c2738ab734c472b6a5d07f301c79890a9`.
- Prompt contract SHA-256: `58a517c512603a652153053bdec96a8bdca44cc6c7fe833c67a42e3526ebffaf`.
- Collector snapshot: `collector-v1.source.cjs`, SHA-256
  `e668ebf36d524dd7b8b7974252309b86b5af940a50688da813e6b46a22169db4`.
- Verifier SHA-256: `26cd86cada0ffef2909e927f814fe57f0f19c6a8deaca18c5e09729ff51dce50`.
- Verifier snapshot: `verifier-v1.source.cjs` with the same SHA-256.
- Schema snapshot: `memory-extraction-v3.schema.json`, file SHA-256
  `fda2f4891787557fcbc8fd195c592013fd0f057520f8256cfd8af98edd36c205`.
- Prompt snapshot: `prompt-contract-v1.txt`, SHA-256
  `58a517c512603a652153053bdec96a8bdca44cc6c7fe833c67a42e3526ebffaf`.
- Validator-v1 reconstruction: `validator-v1.cjs`, SHA-256
  `825fdc2834177619d3aa71d87d872d2a78ef330a50ca859b806194ab05569bbc`.
  The validator dependency was not independently hashed before collection; it
  was reconstructed immediately after the run from the then-current function
  and checked by exact score replay. This is a provenance limitation.

## Protocol

- Provider: Codex CLI `0.153.4`; model: `gpt-5.6-luna`.
- One extraction call for each of nine turns; retry policy: none.
- Prompts contain only the product v3 contract and one visible source turn.
  Gold assertions and source spans are used only by the local scorer.
- Every candidate and complete Codex JSONL/stderr receipt is retained locally.
- No candidate is admitted and no Prolog memory is written.

Primary metrics are write-boundary accuracy, exact semantic assertion-set
accuracy, assertion precision/recall, strict and containment-based evidence-span
agreement, and validator admission eligibility. Confidence is excluded from
semantic equality. For `ignore` and `clarify`, this extraction schema can test
only the shared no-write boundary; it cannot claim to distinguish those two
dialogue actions.

This authored nine-case pilot is an engineering diagnostic, not a statistical
estimate. It measures extraction and textual provenance, not solver benefit.

## Observed outcome

All nine calls completed with raw receipts and zero admission writes. Eight
cases had exact semantic assertion sets. The only miss was `extract-07`:
`They use Python.` was normalized to `uses(alex,python)` despite the unresolved
pronoun. Validator v1 marked all nine candidates eligible. A post-hoc v2
validator replay rejects that case via `unresolved_pronoun_subject`; this is a
diagnosis derived from the observed miss and is not generalization evidence.

```sh
CODEX_MODEL=gpt-5.6-luna node product-extraction-v3-eval.cjs \
  --fixture .cdr/waves/product-extraction-v3-eval-v1/fixture.jsonl \
  --gold .cdr/datasets/extraction-annotation-pilot-v1.jsonl \
  --model gpt-5.6-luna \
  --output-root reports/product-extraction-v3-eval-v1/luna \
  --allow-live-provider
```

```sh
node verify-product-extraction-v3-eval.cjs \
  reports/product-extraction-v3-eval-v1/luna/report.json \
  .cdr/waves/product-extraction-v3-eval-v1/fixture.jsonl \
  .cdr/datasets/extraction-annotation-pilot-v1.jsonl
```
