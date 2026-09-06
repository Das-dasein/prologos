# Gamma R8: strict but real OpenAI native usage shape

Fresh β correctly found that `nativeUsage` projects arbitrary extra usage
fields away. However the installed OpenAI Responses SDK declares real native
details: `input_tokens_details { cache_write_tokens, cached_tokens }` and
`output_tokens_details { reasoning_tokens }`. Rejecting all fields except the
three headline counters would make a real Responses reply fail.

## Required alpha R8 repair

- Accept only the SDK v7 ResponseUsage top-level allowlist:
  `input_tokens`, `input_tokens_details`, `output_tokens`,
  `output_tokens_details`, `total_tokens`. Reject every unknown top-level key
  before a local final artifact/receipt.
- Require headline counters as existing non-negative safe integers and exact
  reconciliation. Require each declared details object to have exactly its SDK
  keys above, with non-negative safe-integer counts. Details may be absent only
  when the SDK/provider omits them; when present, no unknown/nonnumeric/
  negative detail is allowed. Keep the raw native response local and canonical
  receipt projection at its three audited counters/E.
- Add fake-only tests for arbitrary `extra`, unknown/malformed detail keys and
  negative detail counters; prove no final artifact/receipt. Preserve a
  realistic SDK-shaped usage reply and all CDD gates.
- Do not touch `.cdr/**`; because `providers/openai-answering.js` changes,
  disclose that receipt v6 will fail its transport source pin and needs a
  separate CDR re-registration. No provider/model call or claim.

Fresh beta must independently test both real-shaped acceptance and unknown
shape rejection. This is an evidence-normalization repair only.
