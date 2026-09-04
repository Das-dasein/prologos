**Verdict:** REQUEST CHANGES

**Round:** 1 (fresh β review)
**Base SHA:** `a1d9222`
**Head SHA:** `56d5263afe784aa8ba52b645d4bc49981975474f`
**Branch:** `cycle/21`
**Review identity:** `beta <beta@prologos.cdd.cnos>`
**Scope:** Issue #21, the exact head above, the CDS contract, generic CDD β
skill, CDR policy, self-coherence report, pilot runner, focused tests and
configuration. No live provider/API call, merge, issue closure, or code edit
was performed.

## Contract and gate results

| Check | Result | Evidence |
|---|---|---|
| Fake deterministic run | **PASS** | `npm run test:pilot`; repeated B1 objects are byte-identical; 12 cases are processed. |
| B4 Matrix B | **PASS** | CLI fake run produced `B4.answer_exact = 12/12`, error `0/12`. |
| B5 boundary | **PASS** | CLI output labels B5 `gold_oracle`; it is not presented as a model result. |
| B1--B5 output shape | **PASS** | Each condition emitted 12 records and a normalized condition-specific `matrixB` cell. |
| Trusted-memory isolation | **PASS** | `memory.pl` and `domain-rules.pl` hashes were unchanged after fake runs; each case builds an ephemeral Prolog program. |
| Leakage gate | **PASS** | Focused test rejects `c_stable_01_a`; provider is not reached. Private-marker and gold-leakage checks are pre-provider. |
| Malformed/incomplete output | **PASS** | Focused runner rejects malformed schema and missing usage with `INCOMPLETE_OUTPUT`/schema failure. |
| Unsafe query/payload | **PASS** | `assert(foo).` gives `UNSAFE_QUERY`; unsafe atom is rejected by the extraction schema. |
| Trusted hash mismatch | **PASS** | Focused test gives `TRUSTED_HASH_MISMATCH`. |
| Live explicit opt-in | **PASS** | CLI without `--allow-live-provider=true` exits `LIVE_OPT_IN`; no provider call is made. |
| Live raw-output requirement | **PASS** | Non-fake `runPilot` without `rawOutputDir` exits `RAW_OUTPUT_REQUIRED`. |
| Usage and budget gates | **PASS** | Missing/inconsistent usage gives `INCOMPLETE_OUTPUT`; over-budget usage gives `BUDGET`. |
| Existing regression suite | **PASS** | `npm test` is green, including live-extraction (15 assertions). |

## Finding

### F-1 — the pinned pilot config does not identify this source commit (D)

`.cdr/results/prolog-memory-eval-v0/pilot-config-v1.json:2` contains the
all-zero SHA `0000000000000000000000000000000000000000`, while
`pilot-runner.js` only checks that `source_commit` has 40 hexadecimal
characters. Consequently every CLI artifact currently reports the zero SHA,
not the exact reviewed source `56d5263afe784aa8ba52b645d4bc49981975474f`.
This violates issue #21 AC6 and the CDR policy requirement that observed or
computed artifacts pin an exact source snapshot. Update the tracked config to
the intended immutable commit (or make the run fail closed when it does not
match the selected source), then add a regression proving the pin.

## Identity/hash duplication audit

The pilot implementation correctly obtains the active profile hash from
`ACTIVE_ONTOLOGY`; no second runtime ontology identity is introduced in
`pilot-runner.js`. Existing repository surfaces still duplicate the active
profile SHA literally in `schemas/memory-extraction.schema.json`,
`cdr-annotation-harness.js`, `test-cdr-annotation.js`, and live fixtures.
The pilot config also intentionally pins literal trusted-source and profile
hashes. These are not changed by this review, but they remain drift-prone:
after a trusted-file or ontology-profile change, all pinned manifests and
fixtures must be regenerated together. This is recorded as maintenance debt,
not silently treated as proof of synchronization.

## Commands and observed results

| Command | Result |
|---|---|
| `npm run test:pilot` | `pilot-runner ok: 8 assertions` |
| `npm test` | all suites passed; `live-extraction ok: 15 assertions` |
| `node pilot-runner.js --condition B1..B5 --output ...` | 12 cases for each; B4 12/12; B5 `gold_oracle` |
| `node cdr-matrix-harness.js` | `gold_contract_valid`; B1--B4 remain N/A until candidate results are supplied |
| live CLI without opt-in | `LIVE_OPT_IN`; provider not invoked |
| non-fake run without raw directory | `RAW_OUTPUT_REQUIRED` |
| malformed/missing usage | `INCOMPLETE_OUTPUT` or schema rejection |
| over-budget usage | `BUDGET` |
| `git status` before artifact | clean apart from no unrelated changes after γ's revert |

No CDR claim, threshold, dataset, oracle, trusted memory, or ontology file was
modified. The fake result establishes harness determinism only; it does not
establish utility, causality, or Prolog superiority.

**Terminal verdict: REQUEST CHANGES**

---

## β-R2 final re-review

**Head SHA:** `29c0562f8d74f3ebbc038762b46c54f8c731772e`
**Branch:** `cycle/21`
**Review identity:** `beta <beta@prologos.cdd.cnos>`

The γ repair pins the pilot config's `source_commit` to the immutable pilot
implementation head `56d5263afe784aa8ba52b645d4bc49981975474f` (the reviewed
pilot code; the later `tree.d` and config commits do not alter that code).
The all-zero source pin finding is resolved. The tree-form dataset view is
present and does not change the pinned JSONL dataset or its SHA-256.

| Final check | Result |
|---|---|
| `npm run test:pilot` | PASS: `pilot-runner ok: 8 assertions` |
| `npm test` | PASS: all suites; live-extraction 15 assertions |
| B1--B5 fake CLI runs | PASS: 12 cases each; source pin is emitted as `56d5263...` |
| B4 Matrix B | PASS: exact `12/12`, stale/contradictory error `0/12` |
| B5 | PASS: `gold_oracle` boundary preserved |
| `cdr-matrix-harness.js` | PASS: `gold_contract_valid`; candidate cells remain N/A until supplied |
| Trusted files | PASS: memory/domain hashes unchanged |
| Live safety gates | PASS: prior no-provider opt-in, raw-output, usage and budget checks remain green |

The remaining literal identity/hash copies are pre-existing schema, fixture,
and annotation-contract surfaces audited in R1; the pilot itself still reads
the active identity from `ACTIVE_ONTOLOGY`. They are maintenance debt, not a
remaining acceptance blocker for this bounded pilot.

No live provider/API call, merge, or issue closure was performed.

**Terminal verdict: APPROVED**
