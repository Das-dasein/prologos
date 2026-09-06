# CDR beta review R2: Codex exec receipt intake v8 evidence repair

Reviewed α repair commit `9998b6ec41edcaf6136f8620b8c77adc3a079a02`
against `gamma-codex-exec-v8-scaffold.md`, β R1
`beta-review-codex-exec-v8.md`, and Gamma repair R1
`gamma-codex-exec-v8-repair-r1.md`.

## Decision

**REVISE.**  This remains an offline preparation-only path; no live Codex
process, credentials, or result interpretation were used in this review.  The
repair closes several R1 integrity gaps, but two required evidence-closure
boundaries still fail open.  It is not ready for `GO_PREPARATION`.

## Reproduced blockers

1. **Synthetic receipts bypass the required closed record shape and 24-pair
   cardinality.**  `validateEnvelope` checks the envelope shape and immutable
   root bindings, then returns immediately for `synthetic_non_result`, before
   it checks `run`, records, scorer, artifacts, or cardinality.  Starting from
   the committed synthetic fixture, setting `records: []` was accepted as
   `{ status: "synthetic-valid-not-aggregable-v8", records: 0 }`.
   Gamma R1 requires exact fields at every receipt/run/record/scorer/artifact
   level and exactly P0/P1 for every registered case.  A non-result kind must
   not create an exception to those intake invariants, or else it is a v8
   receipt format that accepts an incomplete evidence envelope.

2. **`stderr` is not resolved or hash-verified at intake.**  Candidate records
   carry `raw.stdout`, `raw.stderr`, and `raw.final_output`, but validation
   calls `safe(...)` only for stdout and final output.  With the existing
   injected fake-spawn test seam, I collected a 24-record candidate, overwrote
   the first referenced `codex-stderr.txt` after receipt construction, and
   `validateEnvelope(receipt, { rawRoot })` still returned
   `candidate-integrity-valid-not-a-result-v8`.  This directly violates Gamma
   R1's requirement to resolve immutable stdout, stderr, and final-output
   references below the raw root and verify their hashes.  The failure is not
   mitigated by parsing stdout/final output: the declared stderr evidence can
   be changed or removed without invalidating the receipt.

## Confirmed repair evidence

- Candidate receipts now use exact envelope/run/record/scorer/raw shapes;
  arbitrary/extra scorer keys are rejected.  The candidate path pins scorer
  decision to `accepted` and the hidden-contract SHA-256.
- Candidate validation requires all 12 registered cases with one P0 and one
  P1 each (24 records), rejects omission and duplication, and recomputes
  native usage from JSONL stdout plus final-answer shape from final output.
- The adapter invokes the literal executable argument `codex`; it no longer
  accepts a caller `binary` value or `CODEX_BIN`.  The successful test path
  used only an injected fake spawn and asserted that its received executable
  was `codex`.
- A direct offline sweep changed every authority dimension in the supplied
  config (extra key, source/dataset/slot/base/wrapper hashes, sampling, retry
  policy).  Each was rejected before root creation or spawn.  `run.config`
  also carries a self-hash and the registry/command/schema bindings.
- The registry rebuild and committed registry agree; `git diff --check
  9998b6e^ 9998b6e` passed.  The reviewed diff contains no v7 or OpenAI path.
- `node .../validate-codex-exec-receipt-intake-v8.js --self-test`,
  `npm run test:trusted-proof-codex-exec-live-candidate`, and `npm test`
  passed.  The focused candidate test is fake-spawn only.

## Required repair boundary

Repair only the v8 Codex preparation path.  Make non-result receipts obey the
same explicit intended closed schema/cardinality contract (or define a
separate, fully closed non-result schema that cannot be mistaken for a receipt
candidate), and resolve/hash-check `raw.stderr` under `rawRoot` just as for
stdout and final output.  Add focused negative tests for zero/incomplete
synthetic records and mutated, missing, duplicate, and unsafe stderr refs.
Do not invoke `codex exec`, access credentials, modify v7/OpenAI paths,
aggregate a receipt, or claim an evaluation result.  A fresh β review remains
required after repair.
