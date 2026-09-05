# Gamma scaffold: CDR live-run receipt intake (issue #32)

## Purpose and boundary

This is a CDR preparation wave for a future **human-operated** P0/P1 run.
It prepares an auditable local receipt intake only. It must not invoke a
provider, manufacture model answers, or claim that Prolog improves answers.
`prolog-memory-eval-v0` remains `REVISE`; the existing v1 state remains
`GO_OFFLINE_METHOD_DATASET_EQUAL_SLOT` until a real run and fresh CDR beta.

## Immutable inputs that the intake must bind

- source commit; dataset SHA-256; slot-registration file SHA-256 and canonical
  registration self-hash;
- model and provider/adapter identifier; base and wrapper prompt hashes;
  sampling and canonical retry policy;
- for every case and condition, snapshot/query hashes, declared slot size,
  trusted-proof hash (P1 only), raw-output file reference and SHA-256, and
  provider-reported usage including measured effective context budget `E`;
- a scorer decision that contains no hidden answer-contract text.

Raw output is local-only input. The repository stores schemas, validators and
sanitized/empty examples only, never operator raw outputs or credentials.

## Required deterministic rejection gates

Before aggregate scoring, reject: an absent or duplicate P0/P1 record;
non-canonical/mismatched bindings; a source/dataset/slot/config mismatch;
missing raw reference or a raw SHA mismatch; incorrect condition-specific
proof binding; retry-policy mismatch; unequal measured `E`; changed prompt,
snapshot or query; output overwrite; or oracle/control leakage in stored
envelopes. A valid record cannot be replaced in place.

The validator may verify receipt shape and integrity but may not interpret
synthetic fixtures as provider outputs or emit a positive effectiveness score.

## Deliverables for alpha

1. Versioned local receipt manifest/schema plus an explicitly synthetic,
   non-result fixture that proves the parser and rejection gates.
2. Deterministic validator and focused `npm` script; it must work without a
   provider SDK, network, sandbox-exec or a model.
3. Method/status amendment documenting the operator handoff, local raw-output
   boundary, aggregation denominator rules and `INDETERMINATE` exits.
4. Alpha report containing exact commands and scope limits.

## CDR beta acceptance

Fresh beta reproduces the fixture validation from a clean install; independently
tests at least missing/duplicate record, incorrect raw hash, unequal `E`,
wrong immutable binding and oracle leakage rejection; and confirms no provider
call or model-effectiveness claim exists. Beta then issues `GO_PREPARATION` or
`REVISE`, not an effectiveness verdict.

## Handoff after this wave

When the operator returns, they run a selected real adapter explicitly, retain
raw outputs locally, and submit the resulting manifest/artifacts to a fresh
CDR beta. Only that separate audit can produce an observed/computed CDR
receipt, including an `INDETERMINATE` outcome when evidence is incomplete.
