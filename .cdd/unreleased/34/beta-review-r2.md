# Beta review R2: issue #34 OpenAI answering transport — GO

Fresh independent CDD beta reviewed repaired alpha target
`83da6ee9384ca6391765af2665cb759640f1dc6d` against gamma repair R1
`53c827258e70c49124e4401d7a900e1113480328` and the prior beta RC
`438fddf8e9bfa4d9dfccce676ecdeca1d0099d68`.

## Result: GO for this CDD repair

The two RC findings are repaired at the provider-evidence boundary before
local response artifacts or equal-budget processing:

1. A returned `model` is required as an own response field, must be non-empty
   text, and must exactly equal the selected immutable model.
2. Native `input_tokens`, `output_tokens`, and `total_tokens` must each be
   non-negative safe integers and exactly reconcile as
   `total_tokens = input_tokens + output_tokens`.

This GO is limited to the fake-testable CDD transport boundary. It is not a
provider invocation, CDR receipt, model-effectiveness result, or permission
for a live run. Local output remains `not-a-cdr-receipt-v2` pending the stated
CDR-v3 re-registration dependency.

## Independent evidence

- Clean `npm ci` passed: 4 packages added and audit reported 0 vulnerabilities.
- `npm run test:trusted-proof-preflight`,
  `npm run test:trusted-proof-answering`, and `npm test` all passed.
- `git diff --check 53c827258e70c49124e4401d7a900e1113480328
  83da6ee9384ca6391765af2665cb759640f1dc6d` passed.
- A fresh fake-only matrix exercised absent, own-`undefined`, `null`, empty,
  blank, and mismatching returned models, plus negative input, output, and
  total usage counters. Each was rejected; each newly created raw directory
  remained empty (no prompt, raw response, or final metadata file).
- A separate fresh-process check confirmed invalid provider, missing opt-in,
  invalid wire hash, and relative output directory reject before client
  construction and before the official SDK appears in `require.cache`.
  With valid gates, exactly one injected fake client call received exactly
  `{ model: config.model, input: assembled.prompt }`; its fresh local
  directory contains only `submitted-prompt.txt`, `provider-response.raw.json`,
  and `metadata.json`. Existing directory preparation and exclusive raw-file
  writes reject overwrite.
- Direct default executions stayed offline: `trusted-proof-answering.js`
  reported `offline-no-default-provider` with `provider_calls: 0`, and
  `trusted-proof-preflight.js` reported `offline-preflight-only` with
  `provider_calls: 0`.

## Scope audit

The reviewed repair diff changes only `providers/openai-answering.js` and
`test-trusted-proof-answering.js`. This beta artifact is CDD-only; no
`.cdr/**` file, CDR claim, dataset, policy, receipt, historical v0 artifact,
credential, provider/model call, merge, or issue state was changed.
