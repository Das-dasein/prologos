# CDR beta review R4: prolog-memory-eval-v0

## Independent review identity

- Role: independent CDR beta reviewer only; not alpha, gamma, delta, or CDS implementer.
- Identity: `beta@cdr.prologos`.
- Review date: 2026-09-05, Europe/Samara.
- Reviewed checkout: `/Users/artem/Documents/code/prolog-agent-memory`.
- Reviewed source HEAD: `c5a751678282af25b1cc6fe9133bfe557b8d409a`.
- v2 CDS implementation source pinned by `pilot-config-v2.json`: `be3f1dd8625149171383e399e811d7e1b33d04b2`.
- No implementation artifact, trusted Prolog file, dataset, oracle, prior review, receipt, or GO decision was modified.
- No live Codex/OpenAI provider, comparative pilot, external write, or push was used.

## Verdict

**REVISE**.

Alpha R3 closes the R3 findings that were tested here: the producing runner
enforces the registered six-category taxonomy with two cases each; the v2
config has an unambiguous `pilot-config-v2.json` path and a resolvable exact
source pin; the aggregate exposes the required top-level provenance fields;
and the candidate reader rejects inner condition mismatches and missing
`turn_outputs`. SWI execution, distinct B1/B2/B3/B4 paths, answering-model
calls, equal measured `E`, trusted-file immutability, and deterministic fake
aggregate reproduction all pass.

The verdict remains REVISE because candidate validation checks the presence and
shape of hash fields but does not verify their values or the per-condition
`artifact_sha256`. Review-only candidates with altered source, config, prompt,
trusted-file, condition-config, or artifact hashes were accepted. This leaves
the aggregate provenance and immutability gate bypassable. The executed result
boundary remains `fake_determinism_only`; B5 remains `gold_oracle`, and no
PAM-C1 through PAM-C4 claim is transmitted.

## Oracle results

| CDR oracle | Result | Evidence and boundary |
|---|---|---|
| Falsifiability | PASS, bounded | Exact dataset, answer, provenance, budget, hash, condition-path, and fail-closed falsifiers are defined. PAM claims remain `hypothesized`; no live result was inspected. |
| Diagnostic oracles | REVISE | Taxonomy, duplicate/inner condition, `turn_outputs`, top-level hash presence, leakage, short dataset, raw output, usage/E, trusted hash, interval provenance, and duplicate outer condition checks ran. Hash integrity and aggregate artifact-hash equality still have executable acceptance counterexamples. |
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
   source_commit=c5a751678282af25b1cc6fe9133bfe557b8d409a,
   case_count=12

npm run test:cdr-annotation
=> exit 0; cdr annotation ok

npm run test:cdr-matrix
=> exit 0; schema=prolog-memory-evaluation-matrix-v1, case_count=12,
   turn_count=36; all six categories have exactly 2 cases; B1/B2/B3/B4=N/A;
   B5=gold_oracle with write precision=16/16, write recall=16/16,
   active state=12/12, conflict=2/2, provenance=6/6,
   false clarification=0/16, stale/contradictory=0/6

node pilot-runner.js --condition all --output /tmp/cdr-beta-r4.AwCmMf/aggregate-1.json
node pilot-runner.js --condition all --output /tmp/cdr-beta-r4.AwCmMf/aggregate-2.json
=> both exit 0; B1/B2/B3/B4 each answer_exact=12/12 and case_count=12
=> each condition has 72 measured request values, E=8192, budget.equal=true
=> B3 Prolog calls=0; B4 Prolog calls=12; each condition answer calls=12
=> evidence_boundary=fake_determinism_only;
   selected_strongest_non_prolog_baseline=null
=> canonical aggregate SHA-256 for both runs:
   276cb5ee2021a90f13396b31cf9ebe16a35bda735e0562a367092c206291f52e

node cdr-matrix-harness.js --candidate /tmp/cdr-beta-r4.AwCmMf/aggregate-1.json
=> exit 0; candidate reader returned B1-B4 with answer_exact=12/12,
   provenance_completeness=12/12 per condition

git archive HEAD (extracted to /tmp/cdr-beta-r4-clean.57vEbn,
                 local node_modules linked for execution)
=> npm test: exit 0; same 15 live-extraction assertions
=> npm run test:pilot: exit 0
=> aggregate: B1/B2/B3/B4 each [12 cases, budget.equal=true],
   source_commit=be3f1dd8625149171383e399e811d7e1b33d04b2,
   SHA=276cb5ee2021a90f13396b31cf9ebe16a35bda735e0562a367092c206291f52e
```

Pinned hashes observed during the run:

```text
dataset dialogues-pilot-v1.jsonl       ed9dd7f7ab4983266ab2df3a5ccb31a1f8b367163a09f2c57d2d096e8699d041
answer oracle v1                      aee569c01d79403b0b5d92de135238958c2e60c608a91b8ed495ffcd114e36f5
trusted memory.pl                      e288f7433ccec811a233e1e4def34299648d2a0ed53076f2c9e95bb8c78106e4
trusted domain-rules.pl                74b56f8bb03d719d3bcc8729a913b4d9b6a9306c8f432294649514892d2a3773
```

The v2 config is `.cdr/results/prolog-memory-eval-v0/pilot-config-v2.json`,
declares `protocol_version=prolog-memory-evaluation-v2`, and pins the
resolvable implementation commit `be3f1dd8625149171383e399e811d7e1b33d04b2`.
The retained v1 artifacts remain correctly labeled: `gold-run-v1.json` has
`cdr-gold-result-v1`, `pilot-b4-codex-exploratory-v1.json` has
`prolog-memory-pilot-v1`, and `eval-config-v1.json` has `eval-config-v1`.

## Diagnostic negative checks

All temporary fixtures below were created outside the repository and removed
or left only under the system temporary directory:

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

candidate with altered artifact_sha256
=> ACCEPTED
candidate with altered source_commit/config_sha256/prompt hash/
   trusted hash/condition config_sha256
=> ACCEPTED
```

## Findings

### F1 — candidate reader does not verify provenance and artifact hash integrity

**Status: open; REVISE finding.** `scoreCandidateArtifact` now requires
top-level hash fields and prompt provenance, but it only checks types/formats.
It does not compare the aggregate hashes with the pinned config, dataset,
oracle, trusted files, and nested condition artifacts. It also does not verify
that `entry.artifact_sha256` equals the digest of the embedded condition
artifact. Review-only candidates with each of these values altered were
accepted, including a missing `artifact_sha256`.

Required repair: validate exact cross-field equality against the pinned v2
config and registered inputs, verify every nested condition hash, and reject
missing or mismatched artifact digests. Add negative fixtures for each hash
class and for a missing artifact digest.

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
- the v2 configuration path and implementation source pin are explicit and
  resolvable.

This review does not support LLM extraction or answer quality, a selected
baseline, comparative superiority, PAM-C1/C2/C3/C4 transmission, product
usefulness, scientific novelty, or any live-provider result. No
`#CDRReceipt`, GO, or BOUNDED-GO is emitted. This artifact is append-only; the
named integrity repair belongs to the next alpha/CDS cycle.
