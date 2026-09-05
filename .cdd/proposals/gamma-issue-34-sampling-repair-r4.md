# Gamma repair R4: bind declared sampling to the actual OpenAI request

Post-merge audit found that `trusted-proof-live-candidate` records
`config.sampling` in the immutable run but `providers/openai-answering.js`
sends only `{ model, input }` to `responses.create`. This violates the CDR
policy's requirement that sampling is pinned and makes the recorded run differ
from the actual request.

The installed OpenAI Responses SDK accepts `temperature` and `top_p`; it has
no `seed` create parameter. The collector template currently contains `seed`,
so it must be repaired rather than silently ignored.

## Required alpha R4 changes

1. Define a strict, canonical `sampling` object for this transport with exactly
   `temperature` and `top_p`, both finite numbers in the provider-valid range
   (document the exact ranges). Reject missing, extra (including `seed`),
   nonnumeric and out-of-range fields before SDK/client construction.
2. Pass those two exact values unchanged in every `responses.create` request
   alongside the same sealed `model`/`input`, and retain the already exact
   no-wrapper contract. The fake test must capture the request and prove all
   four values match config; no default path calls a client.
3. Update the operator config template and any fake test configs to use only
   this supported sampling contract. Existing CDR registry/schema remains
   unchanged: it binds the submitted run value, not a fixed sampling choice.
4. Add negative fake tests for `seed`, missing/extra fields and range errors
   that assert client counter stays zero and no root/receipt final artifact is
   created. Preserve 24-record positive v3 validation and all prior gates.
5. Do not modify `.cdr/**`, wire/transport pinned source identities unless the
   change is inherently in the transport (which will require a later CDR source
   re-registration before live use); do not invoke a provider or claim a run.

## Important consequent debt

Because CDR v3 pins the prior transport source hash, alpha must label its
candidate output as requiring a new CDR wire-source re-registration. It must
not make the new transport look valid under v3. A fresh CDD beta audits the
repair; then gamma starts that narrow CDR re-registration before closing #34.
