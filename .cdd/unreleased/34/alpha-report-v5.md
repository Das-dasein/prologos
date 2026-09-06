# Alpha report R6: candidate receipt v5 consumer

Gamma authority: `gamma-issue-34-receipt-v5-switch-r6.md` at
`aa3f2244023543cfa5a4ce10082d8c4bcaf75256`.

## Delivered scope

`trusted-proof-live-candidate.js` now consumes only the CDR v5 validator and
wire-authority registry.  It validates config bindings against `registry.wire`,
emits `cognitive-proof-eval-receipt-intake-v5`, records the v5
`wire_authority_prompt_digest_registry`, and writes only
`candidate-receipt-v5.json`.  The operator config is correspondingly v5 and
pins CDR's v5 source authority commit.

The collector's existing gates are unchanged: exact `temperature`/`top_p`,
sealed byte-for-byte prompts, explicit provider/model/live gates, fresh local
evidence paths, sorted 12 x P0/P1 collection, equal-E/pair binding, and no
receipt unless every local scorer decision is accepted.  The default CLI
remains offline and reports zero provider calls.

## Evidence

- `npm run test:trusted-proof-live-candidate` performs a fake full collection:
  24 records validate through v5, only the v5 receipt filename/schema exists,
  malformed sampling and stale source fail before a client/root, a rejected
  local decision leaves no receipt, and the default CLI reports zero calls.
- `npm run test:cdr-receipt-intake:v5` passes the CDR-owned v5 self-test.
- `git diff --check` passes.

## Boundary

No `.cdr/**` file or pinned wire-authority source was changed.  This is a
fake-transport integrity candidate test, not a provider run, CDR receipt,
effect result, credential check, raw-output publication, or aggregate claim.
Fresh independent beta review is still required before any broader decision.
