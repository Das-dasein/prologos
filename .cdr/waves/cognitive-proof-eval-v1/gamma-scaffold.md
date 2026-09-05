# Gamma scaffold: CDR issue #26 — trusted-proof cognitive-memory evaluation

Issue: https://github.com/Das-dasein/prologos/issues/26  
Branch: `cdr/26`  
Base: `366e11f08be3bf7748f9b6e4786797e4b4c35773`  
Mode: prospective, offline-only CDR preparation.

## Boundary

This wave does not reopen or repair `prolog-memory-eval-v0`, whose historical
live-comparison gate remains `REVISE`. It does not call any provider and it
cannot produce a PAM-C1 usefulness receipt. Its output is an auditable method,
synthetic dataset and deterministic oracle for the cognitive-memory core merged
by PR #25. A later human-operated live run will consume those immutable inputs.

## Research gap

The new core deliberately separates a full-Prolog **untrusted thought** process
from a trusted declarative query runtime. Existing CDR material evaluates the
older typed-claim B1–B4 architecture, not the question that the new core makes
falsifiable:

> Given exactly the same accepted-memory snapshot, model, query and effective
> context budget, does supplying a trusted proof/missing-goal result reduce
> answer errors relative to supplying the same serialized accepted memory
> without that result?

This remains a hypothesis. First, the protocol must prevent confusing symbolic
correctness, an LLM's use of the proof, and the untrusted thought transcript.

## Pre-registered future conditions

The later live run must use one fixed model, sampling policy, query prompt,
effective measured context budget `E`, and accepted snapshot per case.

| Condition | Input to answering model | Purpose |
|---|---|---|
| P0 | normalized serialization of the accepted snapshot and query; no proof, no thought transcript | strongest non-proof baseline for this architecture |
| P1 | byte-identical P0 material plus trusted proof DAG or bounded missing-goal report | tests contribution of executable trusted proof |
| PX | optional labelled untrusted thought transcript plus P1 | exploratory only; never selected as a baseline or used for a primary claim |

The answer prompt must say which fields are trusted. P0/P1 must be measured
equal on `E` request by request. The proof, dataset oracle and hidden expected
answer may never appear in a model prompt except the P1 proof result itself;
the future leakage sentinel must distinguish allowed proof content from hidden
oracle-only labels.

## Alpha deliverables

Alpha creates only prospective/offline research artifacts:

1. `method.md`: source identities, exact P0/P1/PX construction, prompt and
   budget invariants, answer/provenance scoring, falsifiers, raw-artifact
   requirements and explicit statement that no live result exists.
2. Synthetic sanitized dataset and manifest. It must include at least two cases
   each for multi-hop derivation, unproved/unknown query, explicit revision,
   temporal direct conflict, provenance/source disambiguation, and a
   full-Prolog thought transcript that is plausible but untrusted. Every case
   supplies accepted declarative snapshot items, query, expected trusted result
   and hidden answer contract.
3. A deterministic validator/oracle command that hashes the dataset, verifies
   every expected proof/missing/conflict state through `runTrustedQuery`, and
   proves that a forged thought transcript cannot change the oracle result.
4. Wave manifest/status and an alpha report stating source commit, commands,
   hashes, coverage and limitations.

The validator is symbolic-core evidence only. It must not create a live-model
artifact, score a model answer, alter historical frozen replay files or claim
usefulness.

## Acceptance oracle

| Axis | Required offline evidence |
|---|---|
| Dataset | synthetic/sanitized origin, stable hash, category coverage and no private local memory |
| Trusted core | every expected proof/unknown/conflict result reproduces from its accepted snapshot |
| Thought boundary | forged/untrusted thought transcript cannot alter trusted oracle result |
| Comparative design | P0/P1 differ only by trusted proof context; PX labelled exploratory |
| Future live gate | configuration/raw/prompt/usage/equal-E requirements and no-oracle-leak sentinel are executable or explicitly named as future CDS work |
| Calibration | no observed/computed effectiveness claim or receipt without a future human-operated live run and fresh CDR beta |

## Constraints

- no provider or model invocation, API key, raw live output or live retry;
- no change to CDR thresholds, historical v0 receipts or claim status;
- never include `data/memory.pl`, personal data, secrets or existing raw live
  output in the dataset;
- no untrusted thought transcript may be used as a trusted proof or oracle;
- alpha does not author beta/gamma verdicts, merge or close issue #26.

## Fresh alpha dispatch

```text
Role: fresh CDR alpha for issue #26 on cdr/26.

Read .cdr/POLICY.md, .cdr/README.md, the existing v2 method/wave status,
.cdd/designs/prolog-cognitive-memory-v1.md, this gamma scaffold and the CDR
alpha contract. Produce only the prospective offline protocol/dataset/oracle
specified here. Run deterministic validation and project regression. Report
immutable commit, commands/results, hashes, coverage, leakage boundary and
named limitations. Do not call a model/provider or issue a CDR receipt.
```

## Fresh beta dispatch

```text
Role: fresh independent CDR beta for issue #26 on cdr/26.

Review only the immutable alpha target against policy, the cognitive-memory
design and this scaffold. Recompute dataset/hash and every trusted oracle case
from clean state; try a forged thought transcript; inspect P0/P1 equality and
oracle-leak boundaries. Confirm no provider/live artifact or effectiveness
claim exists. Return GO/REVISE/NO-GO/INDETERMINATE for method/dataset adequacy
only; do not issue a PAM-C1 receipt.
```
