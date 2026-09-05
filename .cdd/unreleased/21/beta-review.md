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

## β-R3 fresh review — repair round R2

**Verdict:** REQUEST CHANGES

**Round:** R2 (fresh independent β review)
**Base SHA:** `d3c1191385327073c7192a4ea43ed9560c0f07fd`
**Head SHA:** `6efcca82fb5a50b8d2ba3097c3d5a25124549b3d`
**Branch:** `cycle/21`
**Review identity:** `beta <beta@prologos.cdd.cnos>`
**Scope:** Issue #21, the R2 gamma clarification, the v2 CDR method and CDS
handoff, the exact diff against `main`, implementation modules, focused tests,
candidate reader, and trusted-file immutability. No implementation artifact was
edited; no live Codex/OpenAI provider, comparative run, merge, issue edit, or
push was performed.

## §2.0.0 Contract Integrity

| Check | Result | Notes |
|---|---|---|
| Status truth preserved | yes | Issue #21 is OPEN; the R2 scaffold and self-coherence keep fake evidence separate from live CDR evidence. |
| Canonical sources/paths verified | yes | Issue, `.cdr/methods/prolog-memory-evaluation-v2.md`, CDS handoff v2, and alpha repair report R2 were read from this checkout. |
| Scope/non-goals consistent | yes | The diff stays within the pilot runner, candidate reader, config, tests, and cycle evidence. |
| Constraint strata consistent | yes | The scaffold names hard gates, no exceptions, and deferred live comparison/claims. |
| Exceptions field-specific/reasoned | n/a | No exceptions are claimed. |
| Path resolution base explicit | yes | The scaffold defines repo-root paths and caller-provided raw-output roots. |
| Proof shape adequate | yes | Positive and negative cases are specified; implementation gaps are reported below. |
| Cross-surface projections updated | yes | Runner, config, focused tests, and matrix reader are all in the diff. |
| No witness theater / false closure | no | The candidate reader accepts incomplete/duplicate condition coverage (F-2). |
| PR body matches branch files | n/a | No PR was used; the local branch and cycle artifacts were reviewed directly. |
| γ artifacts present | yes | `.cdd/unreleased/21/gamma-clarification-r2.md` is present on `cycle/21`. |

## §2.1 AC coverage

| AC | Status | Evidence |
|---|---|---|
| AC1 distinct B1–B4 paths | partial | Focused test and aggregate show `recent_turns`, `rolling_summary`, `typed_claims_no_prolog`, and `typed_claims_plus_prolog`; B3 has 0 Prolog calls and B4 has 12. The runner still accepts a non-12 dataset (F-1). |
| AC2 final answering-model evaluation | pass | The test ledger observes exactly 36 extraction and 12 answer calls for each of B1, B2, B3, and B4; each has 12 answer records and raw/usage fields. |
| AC3 common measured E | pass | Each condition has exactly 72 ledger measurements; aggregate has 4 × 72 = 288 values, all `E=8192`, `measured_max=8192`, `equal=true`; unequal-E fixture returns `BUDGET_MISMATCH`. |
| AC4 truthful v2 evidence | partial | Normal fake aggregate has v2 identity, hashes, raw refs, usage, context metadata, and 12 records per condition. Candidate-reader completeness is insufficient (F-2). Historical `pilot-b4-codex-exploratory-v1.json` remains v1 and has zero diff. |
| AC5 exact extraction/answer scoring | partial | Separate extraction and answer cells are emitted, but interval provenance is ignored by the answer scorer (F-3). |
| AC6 fail-closed and compatibility gates | partial | Required suites and focused safety fixtures pass; a custom one-case dataset is nevertheless accepted as a complete B1 artifact (F-1). B5 remains `gold_oracle`. |

## Architecture Check

| Check | Result | Notes |
|---|---|---|
| Reason to change preserved | yes | The diff addresses the named pilot condition and reader surfaces. |
| Policy above detail preserved | yes | CDR method and trusted source files remain unchanged. |
| Interfaces remain truthful | no | `scoreCandidateArtifact` can return a matrix for duplicate or internally mismatched conditions (F-2). |
| Registry model remains unified | yes | The runner continues to use `ACTIVE_ONTOLOGY` and pinned identity. |
| Source/artifact/installed boundary preserved | yes | Source modules emit v2 artifacts; no generated dashboard or installed package was changed. |
| Runtime surfaces remain distinct | yes | B1/B2/B3/B4 context kinds and B3/B4 Prolog paths are distinct in the observed run. |
| Degraded paths visible and testable | yes | Fake boundary, missing raw output, unsafe query, hash, budget, and missing-answer failures are visible. |

## Findings

### F-1 — incomplete datasets are emitted as complete condition artifacts (D, mechanical/contract)

`pilot-runner.js:81-84` only checks `records.length !== dataset.length`; it
does not require the registered 12 cases or the six category counts required by
the handoff. A one-record dataset with a matching caller-supplied hash was
accepted and returned `SHORT_ACCEPTED 1 1`. This violates the condition
obligation that every B1–B4 artifact run all 12 registered histories and makes
the resulting `case_count=1` artifact look complete to callers of the condition
API.

Positive regression pair: the registered dataset produces `case_count=12` and
the aggregate produces 12 records for every B1–B4 condition. Negative
regression pair: a one-record or category-imbalanced dataset must fail closed
before provider execution, or be marked `unavailable`; it must not return a
successful condition artifact.

Required fix: validate the registered dataset identity, exactly 12 unique case
IDs, and the expected two cases in each category in the runner, with a focused
negative fixture and provider-call assertion.

### F-2 — candidate reader accepts duplicate and incomplete B1–B4 coverage (D, mechanical/contract)

`cdr-matrix-harness.js:53-61` checks only that `conditions.length === 4` and
that each outer label is in the allowed set. It does not require the exact set
`{B1,B2,B3,B4}`, does not compare `entry.condition` to
`entry.artifact.condition`, and does not validate required top-level hashes,
`dialogue_hash`, `turn_outputs`, scoring, source IDs/turns/intervals, or the
condition artifact hash. Starting from the valid aggregate, replacing all four
entries with the B1 entry produced `DUPLICATE_ACCEPTED`; changing only the
inner condition to B4 produced `INNER_MISMATCH_ACCEPTED`. Both were returned
as a v2 matrix result.

Positive regression pair: the clean aggregate is accepted and yields four
distinct B1–B4 matrix cells. Negative regression pair: duplicate/missing outer
conditions, inner/outer condition mismatch, or any missing required v2 record
field must fail with `MATRIX_CONTRACT` before a matrix is returned.

Required fix: enforce exact condition-set uniqueness and outer/inner identity,
then validate the complete handoff v2 shape and hashes before projecting matrix
cells; add negative fixtures for each rejected shape.

### F-3 — answer provenance completeness ignores inclusive intervals (D, judgment/honest-claim)

`pilot-runner.js:71` computes `provenance_completeness` from source claim IDs and
source turns only. It never compares `answer.intervals` with the oracle's
inclusive intervals, although the v2 method and handoff require intervals as
part of answer classification. A wrapped fake answer that changed stable-01's
interval from the oracle value to `[[99999999,"inf"]]` still produced
`provenance_completeness: {"numerator":1,"denominator":1,"rate":1}` and an
exact answer. Missing or malformed intervals are likewise normalized to `[]`
without rejection.

Positive regression pair: the registered fake answer with matching claim IDs,
source turns, and inclusive intervals receives provenance completeness 1/1.
Negative regression pair: any missing, malformed, or unequal interval must
receive provenance 0/1 (or fail closed), even when answer text is exact.

Required fix: validate provenance arrays and compare normalized inclusive
intervals against the answer oracle before awarding completeness; add wrong,
missing, and malformed interval fixtures.

## Commands and exact results

| Command | Result |
|---|---|
| `npm run test:pilot` | exit 0; `pilot-runner ok: v2 condition paths, answer calls, budget, provenance and fail-closed gates` |
| `npm test` | exit 0; `ok`, `cdr gold harness ok`, `core/domain boundary ok`, `memory-store ok`, `memory reflection ok`, `codex-provider ok`, `ontology-harness ok`, `elenchus ok`, `registry-ingestion ok`, `live-extraction ok: 15 assertions` |
| `npm run test:cdr-matrix` | exit 0; `case_count=12`, `turn_count=36`, B1–B4 `N/A`, B5 `gold_oracle` with write precision/recall `16/16`, active state `12/12`, conflict `2/2`, provenance `6/6` |
| `npm run test:cdr-gold` | exit 0; `status=ok`, `mode=gold-injection`, `case_count=12`; all 12 case records status `ok` |
| `npm run test:cdr-annotation` | exit 0; `cdr annotation ok` |
| `node pilot-runner.js --condition all --output /tmp/.../aggregate.json` | exit 0; one aggregate written; B1, B2, B3, B4 each `case_count=12`, answer exact `12/12`, 72 budget measurements, `E=8192`, `equal=true`; boundary `fake_determinism_only`; baseline `null` |
| `npm run test:cdr-matrix -- --candidate /tmp/.../aggregate.json` | exit 0; v2 candidate projection returned four B1–B4 cells, each answer exact `12/12`, stale/contradictory error `0/12`, provenance `12/12` |
| adversarial candidate reader fixtures | exit 0 from harness script, but invalid duplicate and inner-mismatch candidates were **accepted** (`DUPLICATE_ACCEPTED`, `INNER_MISMATCH_ACCEPTED`) — F-2 |
| adversarial short dataset | exit 0 from harness script, but incomplete condition was **accepted** (`SHORT_ACCEPTED 1 1`) — F-1 |
| adversarial wrong interval | exit 0 from harness script, but provenance remained `1/1` — F-3 |
| `git diff --check main...HEAD` | exit 0; no whitespace findings |

## Safety, identity, and evidence boundary

`memory.pl` SHA-256 is
`e288f7433ccec811a233e1e4def34299648d2a0ed53076f2c9e95bb8c78106e4`;\
`domain-rules.pl` SHA-256 is
`74b56f8bb03d719d3bcc8729a913b4d9b6a9306c8f432294649514892d2a3773`.
Both remained unchanged after all runs. The historical saved B4 result remains
`schema_version=prolog-memory-pilot-v1`; the new fake output is
`schema_version=prolog-memory-pilot-v2`, so no v1 result was relabeled v2.
The tracked config retains the legacy filename `pilot-config-v1.json` while
declaring `protocol_version=prolog-memory-evaluation-v2`; this is a naming debt
in an input config, not a v1 result artifact.

No remote CI conclusion is available for this local, unpushed head; external
push/records were prohibited. Local required checks above are the reproducible
software evidence. The fake run proves harness behavior and determinism only;
it supplies no live model quality, PAM-C1–C4, utility, causal, superiority, or
PAM-C1 evidence. B5 remains the bounded `gold_oracle` ceiling. A future fresh
independent CDR β must review any live result.

**Terminal verdict: REQUEST CHANGES**
