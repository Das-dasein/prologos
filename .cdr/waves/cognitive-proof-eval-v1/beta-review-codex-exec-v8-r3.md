# CDR beta review R3: Codex exec receipt intake v8 closure

Reviewed alpha commit `4de99a756423f477ba2e050801aa753c4a719a89`
against the original Gamma scaffold, beta R1/R2, and Gamma repair R1/R2.

## Decision

**GO_PREPARATION.**  The v8 path is an offline, forward-only preparation
mechanism.  This decision does not authorize a live run, aggregation, or an
effectiveness claim; a future live artifact requires a fresh CDR review.

## Independent R3 evidence

- The committed synthetic envelope has exactly 24 distinct record IDs: one P0
  and one P1 for each of the 12 immutable registered cases.  It now has the
  same exact envelope/run/record/scorer/raw shape and pair-cardinality checks
  as a candidate, and remains non-aggregable only because its kind is
  `synthetic_non_result`.
- Starting from that fixture, independent mutations to empty records, a
  partial record set, duplicate record, extra run/scorer data, rejected scorer,
  unsafe stderr path, and duplicate stderr/stdout reference all rejected.
- With an injected fake spawn only, a collected 24-record candidate rejected
  R1/R2 mutations: envelope/command extras, forged native total, duplicate raw
  member, unsafe stderr path, forged stderr hash, overwritten stderr content,
  and malformed final output.  The fake received literal executable `codex`;
  `--model` must equal the explicit config model, and no candidate was created
  for the mismatched value.
- The full supplied config authority was independently mutated dimension by
  dimension (provider, source/dataset/slot/base/wrapper identities, sampling,
  and retry policy); each rejected before root creation and before any fake
  spawn.  The operator-selected non-empty model is sealed into `run.config`
  and must match the explicit `--model`; it is not silently defaulted.
- `raw.stdout`, `raw.stderr`, and `raw.final_output` are all exact local
  artifact/hash objects.  Candidate intake resolves each below `rawRoot`,
  rejects duplicate refs, and hash-verifies every member; stdout usage and
  final answer schema are recomputed as before.

## Verification

- `node .cdr/waves/cognitive-proof-eval-v1/validate-codex-exec-receipt-intake-v8.js --self-test`
- `npm run test:trusted-proof-codex-exec-live-candidate`
- an independent in-memory fake-spawn R1/R2 negative sweep
- `npm test`
- `git diff --check 9905c97..4de99a7` and
  `git diff --check 4de99a7^ 4de99a7`

All passed.  No real `codex exec` process or credential was used.  The alpha
diff is confined to v8 intake schema/fixture/validator, the R2 repair note,
and the fake-only test; no v7/OpenAI path changed.
