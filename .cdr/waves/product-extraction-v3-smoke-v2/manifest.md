# Product extraction v3 smoke v2

Status before provider output: frozen one-call engineering smoke after repairing
the pre-output schema defect observed in v1.

- Source commit: `f9f1293b69d1c84862bd0bce421cdad4b6e618a0` with an intentionally dirty research worktree.
- Fixture file SHA-256: `f819ba1e17296007ef9498d26f617d41ca07d5c6e035434dae5894e6f2f110b9`
- Product schema file SHA-256: `fda2f4891787557fcbc8fd195c592013fd0f057520f8256cfd8af98edd36c205`
- Product schema canonical SHA-256: `1b93c9c4889585c6dee5421c07e3907c2738ab734c472b6a5d07f301c79890a9`
- Prompt contract SHA-256: `58a517c512603a652153053bdec96a8bdca44cc6c7fe833c67a42e3526ebffaf`
- Provider: Codex CLI `0.153.4`, authenticated with ChatGPT.
- Model pin: `gpt-5.6-luna`.
- Planned provider calls: exactly one; retry policy: none.
- Admission writes: zero; output remains an untrusted candidate.
- No gold extraction or answer is defined. Passing proves only live transport,
  v3 schema acceptance, exact evidence-span validation and quarantine.

```sh
CODEX_MODEL=gpt-5.6-luna node product-extraction-v3-smoke.cjs \
  --fixture .cdr/waves/product-extraction-v3-smoke-v2/fixture.json \
  --model gpt-5.6-luna \
  --output reports/product-extraction-v3-smoke-v2/luna/report.json \
  --allow-live-provider
```

```sh
node verify-product-extraction-v3-smoke.cjs \
  reports/product-extraction-v3-smoke-v2/luna/report.json \
  .cdr/waves/product-extraction-v3-smoke-v2/fixture.json
```

## Observed outcome

The one allowed call completed. The retained candidate contains two assertions,
two verbatim Russian evidence spans and zero validator diagnostics. The report
records `admission_writes: 0` and remains an untrusted candidate. Report file
SHA-256: `fc3c886656044e1a124aa0769840fd7a4bb14bd2d929acb88b2effe165ddfe98`.
