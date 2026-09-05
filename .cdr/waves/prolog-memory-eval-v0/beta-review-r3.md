# CDR beta review R3: prolog-memory-eval-v0

## Independent review identity

- Role: independent CDR beta reviewer only; not alpha, gamma, delta, or CDS implementer.
- Identity: `beta@cdr.prologos`.
- Review date: 2026-09-05, Europe/Samara.
- Reviewed checkout: `/Users/artem/Documents/code/prolog-agent-memory`.
- Reviewed source HEAD: `dca9b135d7b866564b136a64f027f50f70c639d3`.
- CDS implementation source pinned by `pilot-config-v1.json`: `eab1f0c956527e4785be9540b017e98f98616b45`.
- No implementation artifact, trusted Prolog file, dataset, oracle, prior review, receipt, or GO decision was modified.
- No live Codex/OpenAI provider, comparative pilot, external write, or push was used.

## Verdict

**REVISE**.

The SWI-backed CDS harness now executes distinct B1/B2/B3/B4 paths on the
registered synthetic pilot, calls the answering-model adapter for every case,
keeps B3 free of Prolog calls, measures equal `E`, and reproduces the fake
aggregate deterministically. The bounded B5 gold oracle also remains
reproducible. These observations establish harness behavior only and carry
the explicit `fake_determinism_only` / `gold_oracle` boundaries.

The wave remains REVISE because the v2 handoff contract has correctable
validation and provenance gaps. The runner does not enforce the six-category
two-case dataset taxonomy; the aggregate candidate reader accepts malformed
inner condition artifacts and missing required records; the aggregate omits
some required top-level hashes; and a file named `pilot-config-v1.json`
declares the v2 protocol. No result supports PAM-C1 through PAM-C4, a live
model comparison, baseline superiority, or a CDR receipt.

## Oracle results

| CDR oracle | Result | Evidence and boundary |
|---|---|---|
| Falsifiability | PASS, bounded | The registered method has exact case, answer, provenance, budget, hash, and fail-closed falsifiers. The PAM claims remain `hypothesized`; no live result was inspected or certified. |
| Diagnostic oracles | REVISE | SWI execution, trusted-source immutability, usage reconciliation, answer calls, B3/B4 Prolog-path distinction, interval mismatch, duplicate outer conditions, missing raw output, unequal budget, and short-dataset checks ran. Category-completeness and full candidate-wire validation still have executable counterexamples. |
| Reproduction from clean | PASS for current fake harness; REVISE for transmissible research method | The current checkout reproduced all requested local commands and two byte-identical in-memory aggregate runs. This is a fake-provider method check, not a clean live-model reproduction. |
| Citation integrity | PASS, bounded | No external empirical claim or paper result is invoked. Local CDR method, policy, manifest, and CDS handoff are the governing sources. |
| Data-policy compliance | PASS for this review | The registered 12-case dataset is synthetic, `data/memory.pl` was not exported or sent to a provider, and the pinned dataset/trusted-file digests were checked. |
| Claim/evidence alignment | REVISE | Evidence supports only deterministic software behavior and the B5 symbolic ceiling. It does not support extraction quality, final-answer quality, a baseline comparison, or PAM usefulness. |

## Reproduction record

Environment: `swipl` at `/opt/homebrew/bin/swipl`, SWI-Prolog `10.0.2 for
arm64-darwin`; exact HEAD above; implementation tree was clean before the
review artifact was created and remained unchanged during all runs.

```text
npm test
=> exit 0
=> ok; cdr gold harness ok; core/domain boundary ok; memory-store ok;
   memory reflection ok; codex-provider ok; ontology-harness ok; elenchus ok;
   registry-ingestion ok; live-extraction ok: 15 assertions

npm run test:pilot
=> exit 0
=> pilot-runner ok: v2 condition paths, answer calls, budget, provenance and fail-closed gates

npm run test:cdr-matrix
=> exit 0
=> schema=prolog-memory-evaluation-matrix-v1, case_count=12, turn_count=36
=> all six categories have exactly 2 cases
=> B1/B2/B3/B4=N/A without a candidate; B5=gold_oracle
=> B5 write precision=16/16, write recall=16/16, active state=12/12,
   conflict=2/2, provenance=6/6, false clarification=0/16,
   stale/contradictory=0/6

npm run test:cdr-gold
=> exit 0; schema=cdr-gold-result-v1, status=ok, mode=gold-injection,
   source_commit=dca9b135d7b866564b136a64f027f50f70c639d3,
   case_count=12

npm run test:cdr-annotation
=> exit 0; cdr annotation ok

node pilot-runner.js --condition all --output /tmp/cdr-beta-r3.B7YhZt/aggregate-1.json
node pilot-runner.js --condition all --output /tmp/cdr-beta-r3.B7YhZt/aggregate-2.json
=> both exit 0 and write prolog-memory-pilot-v2 aggregate artifacts
=> B1=12/12 answer_exact, B2=12/12, B3=12/12, B4=12/12
=> each condition has case_count=12 and 72 measured request values;
   configured/measured E=8192 and budget.equal=true
=> B3 Prolog calls=0; B4 Prolog calls=12; each B1-B4 answer calls=12
=> aggregate evidence_boundary=fake_determinism_only,
   selected_strongest_non_prolog_baseline=null
=> canonical aggregate SHA-256 for both runs:
   4cd06361e4fa592844b151273e8313855d3093c4e928cab4b30cf063b7fdb569

node cdr-matrix-harness.js --candidate /tmp/cdr-beta-r3.B7YhZt/aggregate-1.json
=> exit 0; candidate reader returned matrixB B1-B4 with answer_exact=12/12
   and provenance_completeness=12/12 for each condition
```

Pinned hashes observed during the run:

```text
dataset dialogues-pilot-v1.jsonl       ed9dd7f7ab4983266ab2df3a5ccb31a1f8b367163a09f2c57d2d096e8699d041
answer oracle v1                      aee569c01d79403b0b5d92de135238958c2e60c608a91b8ed495ffcd114e36f5
trusted memory.pl                      e288f7433ccec811a233e1e4def34299648d2a0ed53076f2c9e95bb8c78106e4
trusted domain-rules.pl                74b56f8bb03d719d3bcc8729a913b4d9b6a9306c8f432294649514892d2a3773
```

The hashes of `memory.pl` and `domain-rules.pl` were unchanged across the
aggregate run. Fake raw provider envelopes, prompt hashes, source turns,
intervals, provenance IDs, context hashes, and usage records were present in
condition artifacts. A wrong stable-01 interval produced provenance `0/12`,
showing the repaired interval equality gate.

## Diagnostic negative checks

The following review-only temporary inputs were not written to the repository:

```text
12 unique cases with one category changed, config dataset hash updated
=> ACCEPTED by pilot-runner (category counts are not checked)

aggregate candidate with B1 inner artifact.condition changed to B4
=> ACCEPTED by cdr-matrix-harness.js

aggregate candidate with B1 first record.turn_outputs removed
=> ACCEPTED by cdr-matrix-harness.js

aggregate candidate with duplicate outer condition B3
=> REJECTED: candidate must contain each B1-B4 condition exactly once

wrong stable-01 answer interval
=> run completed; stable-01 provenance numerator=0, overall records=12
```

The existing tests also showed fail-closed rejection for a short/leaked dataset
(`DATASET_CASE_COUNT`), a missing raw provider output (`RAW_OUTPUT_MISSING`),
unequal measured E (`BUDGET_MISMATCH`), and a trusted-memory hash mismatch
(`TRUSTED_HASH_MISMATCH`).

## Findings

### F1 — pilot runner does not enforce the registered category taxonomy

**Status: open; REVISE finding.** `validateDataset` enforces 12 cases,
unique IDs, three dialogue turns, operations, and an oracle, but does not
enforce the six categories and exactly two cases per category required by the
manifest and v2 handoff. A review-only dataset with 12 unique, otherwise
well-shaped cases and an updated temporary dataset hash was accepted.

Required repair: validate the registered category set and exact two-per-category
counts in the producing runner, and add a negative test that reaches this
diagnostic after the temporary input hash is intentionally updated.

### F2 — candidate reader accepts malformed inner condition artifacts

**Status: open; REVISE finding.** `scoreCandidateArtifact` checks the outer
B1-B4 labels and several evidence fields, but does not require
`entry.artifact.condition === entry.condition` and does not require all fields
in the v2 condition record contract. The reader accepted both an inner B1
artifact relabeled B4 and a condition artifact with `turn_outputs` removed.

Required repair: validate the complete aggregate and condition wire schema,
including inner/outer identity, protocol/source/config/oracle/trusted/prompt
hash consistency, every required record field, and the artifact hash; add
negative fixtures for each class of omission or mismatch.

### F3 — aggregate does not expose all required top-level provenance hashes

**Status: open; REVISE finding.** The generated aggregate top-level keys are
`artifact_kind, conditions, config_sha256, dataset_sha256, evidence_boundary,
failed_or_unavailable_cases, measured_effective_context_budget_tokens,
measurement_definition, oracle_sha256, protocol_version,
selected_strongest_non_prolog_baseline, source_commit, schema_version`.
The v2 handoff requires the aggregate manifest to include all prompt, config,
dataset, and source hashes; prompt-adapter, answer-prompt, and trusted-memory/
domain hashes remain only inside condition artifacts. The candidate reader does
not detect their absence.

Required repair: emit and verify the complete aggregate-level hash envelope,
with exact equality to every condition artifact and the pinned config.

### F4 — v2 configuration is stored under a v1 filename

**Status: open; REVISE finding.** `.cdr/results/prolog-memory-eval-v0/
pilot-config-v1.json` declares `protocol_version:
prolog-memory-evaluation-v2`, while the file name remains `-v1`. Historical
v1 result artifacts (`pilot-b4-codex-exploratory-v1.json` with
`prolog-memory-pilot-v1`, and `gold-run-v1.json` with `cdr-gold-result-v1`)
remain v1 and were not changed. The current v2 config needs an unambiguous v2
artifact name/path or an explicit compatibility designation, with callers and
hash references updated consistently.

## Explicit claim/evidence boundary

This review supports only:

- SWI-Prolog is the executable canonical runtime for the exercised harness;
- the registered 12-case synthetic dataset and trusted-source hashes pass the
  executed preflight checks;
- B1-B4 have distinct observed software context paths in the fake provider;
- each B1-B4 invokes the answer adapter 12 times; B3 invokes Prolog 0 times
  and B4 invokes it 12 times;
- fake aggregate outputs are deterministic with exact equal measured `E=8192`;
- the B5 symbolic result is a 12-case `gold_oracle` slice.

This review does not support LLM extraction or answer quality, a selected
baseline, comparative superiority, PAM-C1/C2/C3/C4 transmission, product
usefulness, scientific novelty, or any live-provider result. No
`#CDRReceipt`, GO, or BOUNDED-GO is emitted by this review. This artifact is
append-only; the named fixes belong to the next alpha/CDS repair.
