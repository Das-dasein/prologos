# CDR beta review R5: prolog-memory-eval-v0

## Independent review identity

- Role: independent CDR beta reviewer only; not alpha, gamma, delta, or CDS implementer.
- Identity: `beta@cdr.prologos`.
- Review date: 2026-09-05, Europe/Samara.
- Reviewed checkout: `/Users/artem/Documents/code/prolog-agent-memory`.
- Reviewed source HEAD: `0ad617bca7415355e799897a06619f0222ce9b78`.
- v2 CDS implementation source pinned by `pilot-config-v2.json`: `6c6fb2ae8bdf430ca78eeb0c23f147db339841f5`.
- No implementation artifact, trusted Prolog file, dataset, oracle, prior review, receipt, or GO decision was modified.
- No live Codex/OpenAI provider, comparative pilot, external write, or push was used.

## Verdict

**REVISE**.

Alpha R4 closes the previously reported reader gaps that were exercised here:
`artifact_sha256` is recomputed, aggregate and condition metadata fields are
compared, prompt provenance is compared, taxonomy remains strict, and the v2
configuration and source pin are explicit. Full local regression, SWI runtime,
clean-archive fake aggregate reproduction, and all previous fail-closed gates
pass.

One integrity gap remains. The candidate reader verifies internal equality and
format, but does not bind `config_sha256` to the embedded config or bind the
source/oracle/trusted/prompt hashes to the actual pinned files/config. A
candidate with a self-consistent forged metadata set and recomputed nested
artifact hashes was accepted. This leaves provenance claims alterable while
preserving the current reader's internal checks. The executable evidence still
has `fake_determinism_only` and `gold_oracle` boundaries; no PAM claim is
transmitted.

## Oracle results

| CDR oracle | Result | Evidence and boundary |
|---|---|---|
| Falsifiability | PASS, bounded | Exact dataset, answer, provenance, budget, hash, condition-path, and fail-closed falsifiers are defined. PAM claims remain `hypothesized`; no live result was inspected. |
| Diagnostic oracles | REVISE | Taxonomy, duplicate/inner condition, `turn_outputs`, top-level hash presence, artifact digest, individual hash substitutions, leakage, short dataset, raw output, usage/E, trusted hash, interval provenance, and duplicate outer condition checks ran. A coherent forged metadata set remains accepted. |
| Reproduction from clean | PASS for fake harness behavior; REVISE for transmissible research evidence | A `git archive` of the reviewed HEAD with local dependencies reproduced `npm test`, `npm run test:pilot`, and the aggregate. No live-model reproduction exists. |
| Citation integrity | PASS, bounded | No external empirical result is invoked. Local CDR method, policy, manifest, and CDS handoff are the governing sources. |
| Data-policy compliance | PASS for this review | The registered dataset is synthetic; `data/memory.pl` was not exported or sent to a provider; dataset and trusted-source hashes were checked. |
| Claim/evidence alignment | REVISE | Evidence supports software harness behavior and the bounded B5 symbolic ceiling only. It does not support extraction quality, final-answer quality, baseline superiority, or PAM usefulness. |

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
   source_commit=0ad617bca7415355e799897a06619f0222ce9b78,
   case_count=12

npm run test:cdr-annotation
=> exit 0; cdr annotation ok

npm run test:cdr-matrix
=> exit 0; schema=prolog-memory-evaluation-matrix-v1, case_count=12,
   turn_count=36; all six categories have exactly 2 cases; B1/B2/B3/B4=N/A;
   B5=gold_oracle with write precision=16/16, write recall=16/16,
   active state=12/12, conflict=2/2, provenance=6/6,
   false clarification=0/16, stale/contradictory=0/6

node pilot-runner.js --condition all --output /tmp/cdr-beta-r5-cli.xX8rSe/aggregate-1.json
node pilot-runner.js --condition all --output /tmp/cdr-beta-r5-cli.xX8rSe/aggregate-2.json
=> both exit 0; B1/B2/B3/B4 each answer_exact=12/12 and case_count=12
=> each condition has 72 measured request values, E=8192, budget.equal=true
=> B3 Prolog calls=0; B4 Prolog calls=12; each condition answer calls=12
=> evidence_boundary=fake_determinism_only;
   selected_strongest_non_prolog_baseline=null
=> canonical aggregate SHA-256 for both runs:
   a22da947437f741703f6bad5781d4da59e34c91f3b90691d0e844899112031ba

node cdr-matrix-harness.js --candidate /tmp/cdr-beta-r5-cli.xX8rSe/aggregate-1.json
=> exit 0; candidate reader returned B1-B4 with answer_exact=12/12,
   provenance_completeness=12/12 per condition

git archive HEAD (extracted to /tmp/cdr-beta-r5-clean.eF6dC2,
                 local node_modules linked for execution)
=> npm test: exit 0; same 15 live-extraction assertions
=> npm run test:pilot: exit 0
=> aggregate: B1/B2/B3/B4 each [12 cases, budget.equal=true], E=8192,
   source_commit=6c6fb2ae8bdf430ca78eeb0c23f147db339841f5,
   SHA=a22da947437f741703f6bad5781d4da59e34c91f3b90691d0e844899112031ba
```

Pinned hashes observed during the run:

```text
dataset dialogues-pilot-v1.jsonl       ed9dd7f7ab4983266ab2df3a5ccb31a1f8b367163a09f2c57d2d096e8699d041
answer oracle v1                      aee569c01d79403b0b5d92de135238958c2e60c608a91b8ed495ffcd114e36f5
trusted memory.pl                      e288f7433ccec811a233e1e4def34299648d2a0ed53076f2c9e95bb8c78106e4
trusted domain-rules.pl                74b56f8bb03d719d3bcc8729a913b4d9b6a9306c8f432294649514892d2a3773
```

`pilot-config-v2.json` declares `protocol_version=prolog-memory-evaluation-v2`
and pins the resolvable implementation commit
`6c6fb2ae8bdf430ca78eeb0c23f147db339841f5`. The v1 historical artifacts remain
correctly labeled and were not modified.

## Diagnostic negative checks

Temporary fixtures were created outside the repository:

```text
12 unique cases with one category changed, config dataset hash updated
=> REJECTED DATASET_CATEGORY

aggregate B1 inner artifact.condition changed to B4
=> REJECTED: candidate B1 condition artifact is incomplete

aggregate B1 first record.turn_outputs removed
=> REJECTED: candidate B1 condition artifact is incomplete

aggregate top-level prompt_provenance removed
=> REJECTED: candidate top-level provenance hashes are incomplete

aggregate top-level trusted_domain_sha256 removed
=> REJECTED: candidate top-level provenance hashes are incomplete

aggregate duplicate outer condition B3
=> REJECTED: candidate must contain each B1-B4 condition exactly once

aggregate artifact_sha256 altered
=> REJECTED: candidate B1 artifact hash mismatch

aggregate source/dataset/oracle/config/trusted/prompt hash altered singly
=> REJECTED by candidate-to-condition consistency or pinned dataset check

wrong stable-01 answer interval
=> run completed; stable-01 provenance numerator=0/1

short one-case dataset
=> REJECTED DATASET_CASE_COUNT

gold ID in a valid 12-case dialogue prompt
=> REJECTED GOLD_LEAKAGE before provider call

missing raw provider output
=> REJECTED RAW_OUTPUT_MISSING

unequal measured E
=> REJECTED BUDGET_MISMATCH

trusted memory hash mismatch
=> REJECTED TRUSTED_HASH_MISMATCH

all metadata hashes forged coherently and nested artifact hashes recomputed
=> ACCEPTED by candidate reader
```

## Findings

### F1 — candidate reader does not bind accepted hashes to the pinned inputs

**Status: open; REVISE finding.** The reader now recomputes each nested
`artifact_sha256` and enforces aggregate-to-condition equality for source,
dataset, oracle, config, trusted-memory/domain, and prompt provenance fields.
It does not recompute `config_sha256` from the embedded condition `config`,
check prompt hashes against the pinned prompt constants, or verify source,
oracle, trusted-file, and config hashes against the registered files. A
review-only candidate with all metadata replaced by consistent forged values
and all nested artifact digests recomputed was accepted.

Required repair: bind the candidate reader to the pinned v2 config and local
registered inputs, recompute the config and input hashes, validate prompt
hashes against the pinned prompt definitions, and retain negative fixtures for
both single-field and coherently forged metadata.

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
- artifact digest recomputation, aggregate/condition consistency, and the
  exercised negative fixtures pass as recorded.

This review does not support LLM extraction or answer quality, a selected
baseline, comparative superiority, PAM-C1/C2/C3/C4 transmission, product
usefulness, scientific novelty, or any live-provider result. No
`#CDRReceipt`, GO, or BOUNDED-GO is emitted. This artifact is append-only; the
named integrity repair belongs to the next alpha/CDS cycle.
