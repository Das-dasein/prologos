# Product extraction v3 smoke v1

Status before provider output: frozen one-call engineering smoke.

- Source commit: `f9f1293b69d1c84862bd0bce421cdad4b6e618a0` with an intentionally dirty research worktree.
- Fixture: `fixture.json`
- Fixture file SHA-256: `f819ba1e17296007ef9498d26f617d41ca07d5c6e035434dae5894e6f2f110b9`
- Product schema file SHA-256: `763ce2ea4b4c3abe34f2550df5abfd0df2464d122b83ec9aaabce1a8731fd7d7`
- Product schema canonical SHA-256: `7b009ff06df3113307d9bdf492167b204ee98fcb51ea296ae78d7fcd9b8c9fc4`
- Prompt contract SHA-256: `58a517c512603a652153053bdec96a8bdca44cc6c7fe833c67a42e3526ebffaf`
- Provider: Codex CLI `0.153.4`, authenticated with ChatGPT.
- Model pin: `gpt-5.6-luna`.
- Planned provider calls: exactly one; retry policy: none.
- Admission writes: zero. The run may produce only an untrusted extraction candidate.
- No gold extraction or answer is defined. A valid candidate demonstrates transport, v3 schema, evidence-span and quarantine compatibility only.

Collection command:

```sh
CODEX_MODEL=gpt-5.6-luna node product-extraction-v3-smoke.cjs \
  --fixture .cdr/waves/product-extraction-v3-smoke-v1/fixture.json \
  --model gpt-5.6-luna \
  --output reports/product-extraction-v3-smoke-v1/luna/report.json \
  --allow-live-provider
```

Verification command:

```sh
node verify-product-extraction-v3-smoke.cjs \
  reports/product-extraction-v3-smoke-v1/luna/report.json \
  .cdr/waves/product-extraction-v3-smoke-v1/fixture.json
```

## Observed outcome

The one allowed attempt ended before model output with provider error
`invalid_json_schema`: the Codex structured-output endpoint required an
explicit `type` beside each `const`. No report candidate was created and no
admission write occurred. This wave is terminal and is not retried; the schema
repair is evaluated under a separately frozen v2 smoke wave.
