# CDR wave manifest: representation-formalization-v1

Status: `hypothesized`, preregistered method only. No provider call, result,
or comparative claim has been produced by this wave.

## Question

For synthetic rule worlds generated from one formal source, does supplying a
model with Prolog syntax (P1) change its ability to answer the same entailment
question relative to an equivalent natural-language description (P0), before
the model can call a Prolog engine or receive any engine output?

This is a representation-of-knowledge experiment. It is not evidence that a
Prolog solver improves answers; that is the later P1-to-P2 comparison.

## Conditions

The same generated case supplies the same natural-language question and the
same required answer envelope in both conditions:

```text
RESULT: entailed
```

or

```text
RESULT: unknown
```

`unknown` means "not derivable from the supplied world and rules". It never
means negation is proved.

| Condition | Supplied world material | Solver access | Purpose |
| --- | --- | --- | --- |
| P0 | Natural-language facts and rules only | none | baseline representation |
| P1 | Semantically equivalent Prolog facts and rules only | none | formal representation |
| P2 | P1 material; later, explicit solver tool access | permitted only in a later wave | solver increment |

P0 and P1 share the non-representation prompt text, question bytes, output
envelope, model, sampling, retry policy, and case order policy. P1 must not
contain an expected label, proof trace, proof digest, answer contract, engine
output, or a tool declaration. The live P0/P1 adapter must have no callable
Prolog-tool surface. P2 is out of scope for this wave.

## Formal source and dataset construction

The dataset is not retrieved or hand-labelled. A deterministic generator takes
one versioned formal model plus a recorded seed and emits, for every case:

1. a finite Horn-clause world (facts, rules, query);
2. its P0 natural-language rendering;
3. its P1 Prolog rendering;
4. ground truth computed by the local Prolog engine from the formal world;
5. a public case manifest without the ground-truth label in either model
   prompt.

The engine is a scorer/oracle only. It runs after case construction and is
never on P1's request path.

The initial fixture has exactly 24 tasks, balanced by the complete Cartesian
product below:

| Dimension | Values |
| --- | --- |
| derivation depth | 1, 3, 5 |
| rule topology | linear chain; conjunctive join with a shared variable |
| oracle class | entailed; unknown |
| replica | 1, 2 |

Thus each depth has eight tasks: four entailed and four unknown. The unknown
cases omit one necessary antecedent (or ask an unreachable goal) while keeping
all other syntax well-formed; no explicit negative fact is inserted merely to
manufacture an unknown result.

## Prospective claim and falsifiers

The only candidate claim is RFR-C1:

> Under the declared generator, model, and prompt controls, P1 changes
> entailment-answer accuracy relative to P0 before either condition can invoke
> a Prolog solver.

Candidate status remains `hypothesized` until a fresh alpha run and a fresh,
independent beta reproduction close a typed receipt.

RFR-C1 is not established if any pair lacks exact question/output equality,
P1 receives a proof or solver capability, the generated P0/P1 worlds are not
semantically equivalent, a ground-truth oracle fails, or the paired accuracy
difference is zero within the declared analysis. Those failures yield REVISE,
NO-GO, or INDETERMINATE rather than an effectiveness claim.

## Required evidence before any claim transmission

- generator version, source commit, seed list, and generated-fixture SHA-256;
- a per-case formal world, P0/P1 renderings, query, topology/depth stratum,
  and engine-computed oracle stored outside model prompts;
- deterministic semantic-equivalence tests that parse/execute the generated
  formal world and reject an invalid stratum or label;
- sealed assembled P0/P1 prompt artifacts and hashes showing identical
  question/output instructions and the absence of forbidden oracle fields;
- raw per-condition model output, provider usage, model/sampling/retry
  metadata, and paired scoring records;
- fresh beta reproduction from a clean checkout.

Input-token counts must be reported per condition. Natural language and Prolog
do not generally serialize to equal lengths, so P0-to-P1 estimates the effect
of the complete representation package, including its length. It does not by
itself identify a length-normalized syntax-only effect; that would require a
separately preregistered ablation.

## Roles and boundaries

- γ = δ for this small local wave: selects the gap, records this manifest,
  routes dispatches, and later applies only receipt gates.
- A fresh α session implements the CDD generator handoff and, if separately
  dispatched, produces the research run artifacts.
- A fresh β session distinct from α audits generator/oracle/prompt boundaries
  and reproduces the declared checks. α = β is prohibited.

No result, dataset-quality, model-superiority, memory-utility, or publication
claim is authorized by this manifest.

## Non-goals

- No external dataset search or retrieval.
- No changes to the historical `cognitive-proof-eval-v1` P0/P1 protocol.
- No P2 implementation or solver-tool comparison in this wave.
- No live provider request until CDD evidence exists and a separate CDR alpha
  dispatch is authorized.
