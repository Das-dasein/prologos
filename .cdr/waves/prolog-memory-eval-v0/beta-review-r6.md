# CDR beta review R6: prolog-memory-eval-v0

## Independent review identity

- Role: independent CDR beta reviewer only; not alpha, gamma, delta, or CDS implementer.
- Identity: `beta@cdr.prologos`.
- Review date: 2026-09-05, Europe/Samara.
- Reviewed checkout: `/Users/artem/Documents/code/prolog-agent-memory`.
- Reviewed source HEAD: `00a8f041755c6e2cd1cffe3410560a56792a48ef`.
- v2 CDS implementation source pinned by `pilot-config-v2.json`: `586a8fff9f41c7e6a84822b2a1a46df7e5927f7e`.
- No implementation artifact, trusted Prolog file, dataset, oracle, prior review, receipt, or GO decision was modified.
- No live Codex/OpenAI provider, comparative pilot, external write, or push was used.

## Verdict

**APPROVED — bounded to harness behavior and fake/gold reproducibility.**

The R6 implementation closes the R5 integrity finding. The candidate reader
recomputes each nested `artifact_sha256`, binds aggregate metadata to the
pinned v2 config and local dataset/oracle/trusted files, and checks prompt
hashes against the pinned config. Coordinated counterfeit metadata is rejected.
Taxonomy, condition identity, required records, measured budget, leakage,
raw output, interval provenance, trusted-file immutability, SWI execution, and
clean-archive reproducibility all pass.

This is a bounded software/harness approval. The fake aggregate remains
`fake_determinism_only`, B5 remains `gold_oracle`, and no evidence supports a
live model comparison or PAM-C1 through PAM-C4. This review does not emit a
`#CDRReceipt`, GO, or BOUNDED-GO decision.

## Oracle results

| CDR oracle | Result | Evidence and boundary |
|---|---|---|
| Falsifiability | PASS, bounded | Exact dataset, answer, provenance, budget, hash, condition-path, and fail-closed falsifiers are defined. PAM claims remain `hypothesized`; no live result was inspected. |
| Diagnostic oracles | PASS, bounded | Hash recomputation, aggregate↔condition consistency, pinned-input binding, coordinated counterfeit rejection, taxonomy, path, leakage, raw output, budget, interval, and trusted-source gates all ran and failed closed as expected. |
| Reproduction from clean | PASS for harness behavior | Current checkout and a `git archive` with local dependencies reproduced the regression and the same fake aggregate SHA. No live-model reproduction exists. |
| Citation integrity | PASS, bounded | No external empirical result is invoked. Local CDR method, policy, manifest, and CDS handoff are the governing sources. |
| Data-policy compliance | PASS for this review | The registered dataset is synthetic; `data/memory.pl` was not exported or sent to a provider; dataset and trusted-source hashes were checked. |
| Claim/evidence alignment | PASS, bounded | Evidence supports deterministic harness behavior and the B5 symbolic ceiling only. It is explicitly not evidence for extraction quality, final-answer quality, baseline superiority, or PAM usefulness. |

## Reproduction record

Environment: SWI-Prolog `10.0.2 for arm64-darwin` at `/opt/homebrew/bin/swipl`;
exact HEAD above; implementation tree was clean before the review artifact was
created and remained unchanged during all runs.

```text
npm test
=> exit 0
=> ok; cdr gold harness ok; core/domain boundary ok; memory-store ok;
   memory reflection ok; codex-provider ok; ontology-harness ok; elenchus ok;
   registry-ingestion ok; live-extraction ok: 15 assertions

npm run test:pilot
=> exit 0
=> pilot-runner ok: v2 condition paths, answer calls, budget, provenance and fail-closed gates

npm run test:cdr-gold
=> exit 0; schema=cdr-gold-result-v1, status=ok, mode=gold-injection,
   source_commit=00a8f041755c6e2cd1cffe3410560a56792a48ef,
   case_count=12

npm run test:cdr-annotation
=> exit 0; cdr annotation ok

npm run test:cdr-matrix
=> exit 0; schema=prolog-memory-evaluation-matrix-v1, case_count=12,
   turn_count=36; all six categories have exactly 2 cases; B1/B2/B3/B4=N/A;
   B5=gold_oracle with write precision=16/16, write recall=16/16,
   active state=12/12, conflict=2/2, provenance=6/6,
   false clarification=0/16, stale/contradictory=0/6

node pilot-runner.js --condition all --output /tmp/cdr-beta-r6.h8SwKx/aggregate-1.json
node pilot-runner.js --condition all --output /tmp/cdr-beta-r6.h8SwKx/aggregate-2.json
node cdr-matrix-harness.js --candidate /tmp/cdr-beta-r6.h8SwKx/aggregate-1.json
=> both aggregate writes exit 0; candidate reader exit 0
=> B1/B2/B3/B4 each answer_exact=12/12 and case_count=12
=> each condition has 72 measured request values, E=8192, budget.equal=true
=> B3 Prolog calls=0; B4 Prolog calls=12; each condition answer calls=12
=> evidence_boundary=fake_determinism_only;
   selected_strongest_non_prolog_baseline=null
=> canonical aggregate SHA-256 for both runs:
   612a0775f6eb728e1ec85be20b68c2717805c3a8744cf88885abe83e38df83c0

git archive HEAD (extracted to /tmp/cdr-beta-r6-clean.mdYNJy,
                 local node_modules linked for execution)
=> npm test: exit 0; same 15 live-extraction assertions
=> npm run test:pilot: exit 0
=> aggregate: B1/B2/B3/B4 each [12 cases, 72 measurements, budget.equal=true],
   E=8192, source_commit=586a8fff9f41c7e6a84822b2a1a46df7e5927f7e,
   SHA=612a0775f6eb728e1ec85be20b68c2717805c3a8744cf88885abe83e38df83c0
```

Pinned input hashes observed and recomputed:

```text
dataset dialogues-pilot-v1.jsonl       ed9dd7f7ab4983266ab2df3a5ccb31a1f8b367163a09f2c57d2d096e8699d041
answer oracle v1                      aee569c01d79403b0b5d92de135238958c2e60c608a91b8ed495ffcd114e36f5
trusted memory.pl                      e288f7433ccec811a233e1e4def34299648d2a0ed53076f2c9e95bb8c78106e4
trusted domain-rules.pl                74b56f8bb03d719d3bcc8729a913b4d9b6a9306c8f432294649514892d2a3773
pilot-config-v2 canonical digest       16dd08f3788831b3a73eddea0c80ca58cdde9015c654dd787fed85c806a8f798
```

The v2 config is `.cdr/results/prolog-memory-eval-v0/pilot-config-v2.json`,
declares `protocol_version=prolog-memory-evaluation-v2`, and pins the
resolvable implementation commit `586a8fff9f41c7e6a84822b2a1a46df7e5927f7e`.
The retained v1 artifacts remain correctly labeled and were not modified.

## Diagnostic negative checks

All fixtures were created outside the repository. Each result below is the
observed fail-closed outcome:

```text
12 unique cases with one category changed, config dataset hash updated
=> REJECTED DATASET_CATEGORY

candidate inner B1 artifact.condition changed to B4
=> REJECTED MATRIX_CONTRACT

candidate B1 first record.turn_outputs removed
=> REJECTED MATRIX_CONTRACT

candidate duplicate outer condition B3
=> REJECTED MATRIX_CONTRACT

candidate top-level prompt provenance removed
=> REJECTED MATRIX_CONTRACT

candidate artifact_sha256 altered
=> REJECTED MATRIX_CONTRACT

candidate source/dataset/oracle/config/trusted/prompt hash altered singly
=> REJECTED MATRIX_CONTRACT

coordinated counterfeit metadata with nested artifact hashes recomputed
=> REJECTED: candidate metadata does not match pinned inputs

short one-case dataset
=> REJECTED DATASET_CASE_COUNT

gold ID in a valid 12-case dialogue prompt
=> REJECTED GOLD_LEAKAGE before provider call

missing raw provider output
=> REJECTED RAW_OUTPUT_MISSING

unequal measured E
=> REJECTED BUDGET_MISMATCH

wrong stable-01 answer interval
=> run completed; stable-01 provenance numerator=0/1

trusted memory hash mismatch
=> REJECTED TRUSTED_HASH_MISMATCH
```

## Findings

No open implementation findings remain within the bounded R6 harness scope.
The evidence boundary is still deliberately limited: fake-provider outputs
demonstrate execution and reproducibility, while B5 injects gold claims and is
an oracle ceiling. A future CDR receipt would need separately reproduced live
provider outputs before making any PAM usefulness or comparative claim.

## Explicit claim/evidence boundary

This review supports only:

- SWI-Prolog `10.0.2` executes the exercised harness;
- the registered synthetic dataset passes exact 12-case and six-category
  taxonomy checks;
- B1/B2/B3/B4 produce distinct observed fake-provider context paths;
- each B1-B4 invokes the answer adapter 12 times; B3 invokes Prolog 0 times
  and B4 invokes it 12 times;
- fake aggregate outputs reproduce deterministically with equal measured
  `E=8192` from the checkout and a git archive;
- B5 remains a 12-case `gold_oracle` symbolic slice;
- aggregate and condition artifacts have verified digest and pinned-input
  consistency under the exercised reader.

This review does not support LLM extraction or answer quality, a selected
baseline, comparative superiority, PAM-C1/C2/C3/C4 transmission, product
usefulness, scientific novelty, or any live-provider result. No
`#CDRReceipt`, GO, or BOUNDED-GO is emitted. This artifact is append-only.
