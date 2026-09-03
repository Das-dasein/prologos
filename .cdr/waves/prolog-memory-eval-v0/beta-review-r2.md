# CDR beta review R2: prolog-memory-eval-v0

## Independent review identity

- Role: independent CDR beta reviewer only; not Sigma, alpha, gamma, or delta.
- Session: `beta-cdr-r2-2026-09-03-clean-01`.
- Review date: 2026-09-03, Europe/Samara.
- Reviewed source commit: `f8796abc1c7c9a0ff2c9a61b32841e0b83bdd250`.
- Harness input-pinning commit supplied by the dispatch: `ea4e725889ebfaf571ba0df2ac4d897b5fc0a2ce`.
- Review environment: clean `git archive` of the reviewed source commit, with the pinned evaluation metadata and existing installed dependencies copied into the archive workspace; no `.git` directory.
- No alpha/CDS implementation, report, manifest, config, dataset, oracle, or prior beta artifact was modified.
- Git identity observed in the project checkout: `artem.tarasov@waveaccess.global`; no beta commit was authored by this review and no GO/BOUNDED-GO receipt gate was asserted.

## Verdict

**REVISE**.

The deterministic B5 gold-injection slice is reproducible and its evidence supports only a bounded symbolic-oracle claim: with the pinned synthetic gold operations, the harness reproduces the expected active claims, conflict states, query answers, and provenance for 12 cases. This is not evidence of live-model extraction quality, answer quality, baseline superiority, or product usefulness.

The registered method remains incomplete for its required live-model conditions. The leakage sentinel and effective-context-budget sentinel are documented and represented as configuration fields, but the reviewed harness executes only `mode=gold-injection`, `condition=B5`; it does not run model prompts, record per-condition context counts, abort on leaked gold content in a model prompt, or reject unequal cross-condition budgets. Under the manifest verdict map this keeps the wave at `REVISE`; thresholds are not weakened.

## Oracle results

| CDR oracle | Result | Evidence and boundary |
|---|---|---|
| Falsifiability | PASS, bounded | The symbolic B5 claim is falsifiable by exact mismatch in active states, conflicts, query answers, provenance, or pinned hashes. The broader PAM usefulness claim remains `hypothesized`; B5 cannot falsify or establish live extraction/answer comparisons. |
| Diagnostic oracles | REVISE | Passed pinned source/input SHA checks, fixed query registry checks, unsafe claim/query rejection, config mode/budget rejection, and duplicate-case rejection. The required live leakage and cross-condition budget sentinels were not executable in this harness. |
| Reproduction from clean | PASS for B5; REVISE for full method | Clean archive reproduced 18/18 source file hashes, `npm test`, `npm run test:cdr-gold`, and the explicit B5 command. The generated result matched `gold-run-v1.json` byte-for-byte. No clean live-model reproduction exists. |
| Citation integrity | PASS, bounded | No external empirical result is invoked. Local CDR doctrine and project policy are the governing references; no citation is used to promote the smoke/gold result into a usefulness claim. |
| Data-policy compliance | PASS for reviewed slice | The source manifest excludes `data/memory.pl` from public benchmark/external model use; the clean run used the pinned local trusted-memory hash and synthetic 12-case dataset. No private-data or external-provider request occurred. |
| Claim/evidence alignment | REVISE | Evidence supports deterministic gold injection only. It does not support extraction precision/recall, answer error, baseline selection, live leakage protection, budget equality, or the primary Prolog usefulness claim. |

## Reproduction record

The archive was created from `f8796abc1c7c9a0ff2c9a61b32841e0b83bdd250`; the `.git` directory was absent. The pinned metadata files were mounted into the archive workspace only for the review run.

Commands and results:

```text
shasum -a 256 -c .cdr/datasets/source-snapshot-f8796ab.sha256
=> OK for all 18/18 listed files

npm test
=> exit 0; node test.js, cdr gold harness, memory-store, and codex-provider checks passed

npm run test:cdr-gold
=> exit 0; status=ok, mode=gold-injection, case_count=12
=> expected clean archive has no .git, so implicit source_commit was null; this was not used as the authoritative comparison

node cdr-eval-harness.js \
  --config .cdr/results/prolog-memory-eval-v0/eval-config-v1.json \
  --dataset .cdr/datasets/dialogues-pilot-v1.jsonl \
  --oracle .cdr/results/prolog-memory-eval-v0/pilot-oracle.json \
  --source-commit ea4e725889ebfaf571ba0df2ac4d897b5fc0a2ce
=> exit 0; status=ok, mode=gold-injection, case_count=12
=> config SHA: 9c31aa7239ad112274c244a4246fc4acb77d267d8d4011098a52aa6b9a7345ba
=> dataset SHA: 88776d46d0ddd34307ef4cfd519e68f17862fd51118463a0ef9497cd25ba0f9f
=> oracle SHA: 846f21fc70defe0211c543c876df0ff1fbd20d24633e5d921dd3320a6f4e67a4
=> trusted memory SHA: 2806860f693d47d306672362d2e1b146fbeabfd5ecde035576542e655b0001d0

cmp reproduced-output.json .cdr/results/prolog-memory-eval-v0/gold-run-v1.json
=> byte_compare_rc=0; both files SHA=18c57c8273c45ece17e4564e48f8aacbf3c87a36813c5ac664921bd2f5bcab40

clean archive source files compared with the checked-out files named by the pinned manifest
=> 18/18 byte-identical
```

## Diagnostic negative checks

The harness rejected each targeted malformed input/configuration:

- config condition changed from `B5`: `CONFIG_MODE`;
- effective context changed from `4096`: `CONFIG_SENTINEL`;
- unregistered query case: `QUERY_REGISTRY`;
- unsafe claim ID: `UNSAFE_CLAIM_ID`;
- 13-record dataset with a duplicate case ID, after its temporary config SHA was updated: `DATASET_COUNT`.

The first duplicate attempt was correctly rejected earlier by `INPUT_SHA256` because the dataset no longer matched the pinned digest; the duplicate-shape check was then reached with a temporary review-only config. No project artifact was changed.

## Findings

### F1 — B5 evidence is valid only as deterministic gold injection

**Status: closed for the bounded B5 reproduction; open for the broader method claim.** The run injects `gold_operations` directly and compares exact symbolic state, conflict state, fixed query output, and provenance. It calls no LLM. The result therefore establishes reproducibility of the symbolic slice, not PAM-C1–C4 effectiveness or any comparison against B1–B3.

### F2 — live-model leakage and context-budget sentinels remain unverified

**Status: open; REVISE finding to alpha/CDS.** The method requires a live harness to reject gold IDs/proposals in model prompts and to reject differing effective context budgets across B1–B4. The reviewed `cdr-eval-harness.js` deliberately rejects every mode/condition other than B5 gold injection and has no prompt construction, provider call, token accounting, or cross-condition comparison. Config fields `leakage_sentinel` and `budget_sentinel` are declarations, not executed sentinel evidence.

Required next evidence: a separately pinned CDS harness/archive that runs the registered live conditions or explicitly records why the next wave changes scope, with provider/model/prompt/version/sampling/retry/budget metadata, raw machine-readable output, fail-closed leakage behavior, and cross-condition budget rejection. Alpha/CDS must provide that matter; beta does not implement it.

### F3 — no transmissible primary usefulness claim

**Status: open by design.** The policy and manifest correctly leave the primary claim `hypothesized`. No result language in this review upgrades it. A future receipt must preserve the distinction between observed/computed gold-oracle results and any separately reproduced live-model results.

## Explicit claim/evidence boundary

Supported by this review:

- the 18-file source snapshot named by `source-snapshot-f8796ab` matches in the clean archive;
- the pinned B5 symbolic run passes its config/input preflight and reproduces the recorded 12-case JSON result byte-for-byte;
- the reviewed negative checks fail closed for the exercised malformed inputs;
- the synthetic-data/private-memory boundary is honored for this run.

Not supported by this review:

- LLM extraction precision, recall, field accuracy, clarification rate, or prompt leakage resistance;
- final-answer correctness, stale/contradictory error, provenance completeness, or any B1/B2/B3 baseline score;
- equality of effective live-model context budgets across conditions;
- a 50% stale-or-contradictory reduction, product usefulness, generalization, or scientific novelty claim;
- a CDR receipt, boundary decision, GO, or BOUNDED-GO.

This artifact is the independent beta review close-out for R2. It is append-only and does not authorize gamma receipt emission or delta boundary transition.
