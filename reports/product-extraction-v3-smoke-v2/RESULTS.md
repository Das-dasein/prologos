# Product extraction v3 live smoke

The first frozen attempt (`product-extraction-v3-smoke-v1`) ended before model
output because the structured-output endpoint rejected `const` fields without
an explicit JSON Schema `type`. The failed attempt is retained rather than
silently replaced.

After fixing only the v3 schema and freezing a new smoke wave (v2), one
`gpt-5.6-luna` Codex CLI call processed:

> Я живу в Самаре и знаю Java.

The model returned:

- `lives_in(user,samara)` with evidence `Я живу в Самаре`;
- `knows_technology(user,java)` with evidence `знаю Java`.

Both evidence spans are exact source substrings, the local validator reports no
diagnostics, and the collector performed zero admission writes. The candidate
therefore demonstrates that the live Codex transport accepts the product v3
schema and preserves quarantine. It does not measure extraction accuracy,
repair quality, or solver benefit: this is one easy authored case with no gold
scoring.

Artifacts:

- report: `luna/report.json` (`fc3c886656044e1a124aa0769840fd7a4bb14bd2d929acb88b2effe165ddfe98`);
- candidate: `aad6842d20ec11b947785572f85bb0f39b1cc990d7d91659e3d5780a5ba8687e`;
- terminal v1 failure: `../product-extraction-v3-smoke-v1/luna-attempt-1/pre-output-failure.json`.

Reproduce the local integrity check without calling a provider:

```sh
node verify-product-extraction-v3-smoke.cjs \
  reports/product-extraction-v3-smoke-v2/luna/report.json \
  .cdr/waves/product-extraction-v3-smoke-v2/fixture.json
```
