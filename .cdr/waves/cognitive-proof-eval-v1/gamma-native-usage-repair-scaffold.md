# Gamma scaffold: native usage integrity in receipt v6 (issue #46)

Fresh CDD beta mutated a valid v5 candidate record after collection so that
`provider_usage.input_tokens = -1`. V5 accepted it because its inherited
validator only required the nested object to exist. Transport-side validation
is not enough: a candidate receipt is an untrusted local submission until CDR
intake independently checks it.

## Required v6 contract

- Create separate forward-only v6 registry/schema/fixture/docs/validator;
  preserve all v5 transport wire authority and prompt/proof/artifact gates.
- For adapter `openai-api`, every record's `provider_usage` must have exactly
  `input_tokens`, `output_tokens`, `total_tokens`; each is a non-negative safe
  integer and `total = input + output`. `measured_effective_context_budget`
  must be a non-negative safe integer exactly equal to native `input_tokens`.
  Do not infer, round or substitute it from config.
- Candidate v6 rejects missing/extra/nonnumeric/NaN/fractional/negative
  counters, total mismatch and measured-E mismatch before any aggregate.
  Synthetic non-result data may use a separate explicit zero-valued valid
  shape, never bypassing the schema.
- All older v1-v5 envelopes are invalid inputs to v6. No provider/network/model
  action, raw live data, aggregation/effectiveness claim, sampling/transport,
  policy/dataset/oracle/threshold/v0 change.

Fresh beta independently mutates every nested usage condition, rebuilds the
registry and confirms all inherited integrity gates remain. GO is preparation
only; a later collector consumer update remains separate.
