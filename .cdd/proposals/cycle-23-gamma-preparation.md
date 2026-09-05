# Gamma preparation: CDD cycle for issue #23

Date: 2026-09-05 (Europe/Samara)  
Role: gamma  
Issue: https://github.com/Das-dasein/prologos/issues/23  
Mode: design-and-build  
Work shape: substantial CDS cycle, consumed later by CDR  
State: `READY-BLOCKED-ON-BASE`

## Observation and selection

| Candidate | Source | Selection clause | Dependency | Decision |
|---|---|---|---|---|
| structured evaluator v4 | failed live preflight interpretation plus reproduced v3 counterexamples | maximum-leverage and dependency-order rule | current evaluator/preflight branch must become the immutable base | selected |
| B3/B4 runner isolation | senior method review | depends on stable v4 answer/evidence contract | next CDS cycle |
| prospective long-context holdout | PAM-C1 construct gap and issue #20 | depends on stable scorer and runner | later CDR/CDS handoff |
| resume Luna live run | operator request, then aborted diagnostic | blocked by invalid question/budget/scorer surfaces | rejected until repairs land |

The selected gap is the earliest independently shippable dependency. Improving
the dataset or spending more provider tokens before the measurement contract
is valid would not close the observed failure.

Peer enumeration performed before issue authoring:

- `.cdd/`, `.cdr/waves/prolog-memory-eval-v0/`, evaluator, runner, schema,
  validation and test surfaces were enumerated;
- `rg` confirmed an existing prospective direction in
  `.cdr/proposals/evaluation-contract-repair-v3.md`, so issue #23 is framed as
  completing an already specified but incompletely implemented contract;
- existing `offline-eval-v3.js`, `validate-offline-eval-v3.js`,
  `schemas/offline-eval-v3.schema.json`, `pilot-runner.js`, and their tests are
  named as compatibility peers, not treated as absent.

## Dependency and branch gate

The issue was prepared while branch `chore/offline-eval-v3-handoff` was at
`e8ecda20889ccf2e832720d9903bc5d3b8e02a0e`; `origin/main` was
`6edf8040a2f77fe57d5463a49d195c87db09f71f`.

Issue #23 depends on the current evaluator/preflight work, which is not yet on
`origin/main`. Gamma must not create `cycle/23` from the stale main base and
must not dispatch alpha from this working branch. Before dispatch, delta must:

1. publish and merge the current branch without
   `reports/live-20260905-225936/`;
2. refresh `origin/main` and reload canonical CDD/CDR skills if their upstream
   SHA changed;
3. verify `origin/cycle/23` is absent and no `.cdd/unreleased/23/` exists on
   the refreshed main;
4. create and publish `cycle/23` from that exact main SHA;
5. materialize the scaffold below as
   `.cdd/unreleased/23/gamma-scaffold.md` on `origin/cycle/23` before alpha
   dispatch.

The interrupted raw directory is not committed, copied, or cited as acceptance
evidence. It remains an untracked partial diagnostic artifact with no aggregate.

## Planned gamma scaffold

### Issue and gap

Issue #23. Evaluator v3 is reproducible but not semantically valid enough for
the next live pilot: keyword matching, incomplete nested schemas, weak
provenance binding and incomplete raw inventory checks allow false pass/fail
outcomes. This cycle implements the prospective structured evaluator v4
contract without running a provider or changing research claims.

### Expected surfaces

- versioned v4 JSON schemas for answers, operations, evidence and replay;
- provider-free structured scorer and CLI;
- exact nested schema validation;
- adversarial, missing/unknown, provenance and raw-binding fixtures;
- operator documentation and package scripts;
- `.cdd/unreleased/23/self-coherence.md` with canonical bare headers.

Compatibility peers alpha must enumerate before implementation:

- `offline-eval-v3.js`, `test-offline-eval-v3.js`;
- `schemas/offline-eval-v3.schema.json`, `validate-offline-eval-v3.js`;
- `pilot-runner.js`, `test-pilot-runner.js`;
- `.cdr/datasets/dialogues-pilot-v1.jsonl` and both answer/pilot oracle files;
- `.cdr/proposals/evaluation-contract-repair-v3.md`;
- every current consumer/producer of answer, provenance, raw manifest and
  replay fields found by `rg`.

### Acceptance-oracle approach

| AC | Oracle |
|---|---|
| AC1 exact contracts | canonical fixtures pass; inconsistent branches, nested extras, missing/duplicate inventory and run/hash contradictions reject |
| AC2 typed scoring | order and ID renaming invariant; relation/argument/polarity/modality/time changes fail |
| AC3 decision semantics | answer/conflict/clarify/insufficient fixtures produce distinct metrics |
| AC4 provenance | fabricated/dangling/wrong-support refs reject |
| AC5 raw binding | missing/duplicate/raw-parsed/hash mismatches fail closed; planned denominator retained |
| AC6 adversarial proof | all six issue counterexamples cannot receive primary pass |
| AC7 compatibility | v3 and full regressions pass; no provider call or CDR claim mutation |

### Implementation constraints

- no network/provider calls and no reading/scoring of the interrupted live raw
  outputs;
- no modifications to B1–B4 runtime construction or prospective dataset;
- no regex/keyword expansion as the primary semantic repair;
- no global semantic aliases, threshold tuning, baseline selection or claim
  promotion;
- preserve v3 as a versioned compatibility surface;
- primary score comes only from structured fields and registered independent
  gold; free text is retained but does not rescue an invalid envelope;
- missing evidence never becomes pass.

### Alpha artifact contract

Alpha writes `.cdd/unreleased/23/self-coherence.md` incrementally with exactly:

- `## Gap`
- `## Skills`
- `## ACs`
- `## Self-check`
- `## Debt`
- `## CDD Trace`

Review-readiness requires a clean diff against the cycle base, focused v4
tests, all existing v3 tests and `npm test`, explicit evidence per AC, and no
untracked generated live artifacts in the proposed commit.

## Alpha dispatch prompt

```text
Role: fresh CDD alpha for Das-dasein/prologos issue #23.
Branch: cycle/23.

Load the canonical CDD loader, CDD.md, CDD alpha role, CDS doctrine and the
issue/design/plan/testing skills named by issue #23. Load CDR.md and
.cdr/POLICY.md only for the evidence boundary; do not load beta or gamma role
state.

Read issue #23 and .cdd/unreleased/23/gamma-scaffold.md as the complete work
contract. Implement all ACs, maintain self-coherence with canonical headers,
run the declared focused and full proof commands, and commit the review-ready
matter. Do not call a provider, inspect the interrupted partial live outputs,
change research claims, or issue a beta verdict/receipt.

Return only artifact facts: immutable target commit, changed surfaces, proof
commands/results, self-coherence path, and any named debt.
```

## Beta dispatch prompt

Beta is dispatched only after alpha records review readiness on an immutable
commit.

```text
Role: fresh independent CDD beta for Das-dasein/prologos issue #23.
Branch: cycle/23.
Review target: <exact alpha commit>.

Load the canonical CDD loader, CDD.md, CDD beta role, CDS review doctrine and
the issue/testing skills named by issue #23. Read issue #23,
.cdd/unreleased/23/gamma-scaffold.md and alpha's committed self-coherence.
Do not consume alpha's hidden rationale or prior session state.

Review every AC against the immutable diff and independently run the focused
v4, v3 compatibility and full regression commands. Exercise the negative
fixtures, especially negation, historical mention, unsupported extra facts,
decision-branch validity, provenance support, complete planned inventory,
raw/parsed binding and missing-output denominators. Confirm that no provider
call, partial-live evidence, PAM-C1 claim or v3 silent upgrade entered scope.

Write the canonical beta review and closeout artifacts. Return APPROVED only
when all ACs and protocol gates pass; otherwise return REQUEST CHANGES with
independently reproducible findings. Do not emit a CDR receipt or research
verdict.
```

## Preparation closeout

Prepared now:

- executable GitHub issue #23;
- selected-gap and dependency record;
- planned gamma scaffold;
- role-separated alpha and beta dispatch prompts;
- explicit partial-run and CDR evidence boundaries.

Not yet authorized by this preparation artifact:

- creation/push of `cycle/23` from a stale base;
- alpha or beta dispatch;
- live-provider execution;
- CDR receipt or PAM-C1 claim.

Next concrete transition: merge the current evaluator/preflight branch, then
perform the branch/scaffold gate and dispatch fresh alpha.
