# CDR wave manifest: llm-metaprolog-chain-memory-v1

Status: `preregistered; not collected`. This supersedes neither the historical
ProverQA P0/P1/P2 runs nor their artifacts. It tests a different claim.

## Claim under test

The LLM is the semantic reasoner. It must itself retain an explicit semantic
representation of language, quantifiers, Boolean structure, ambiguity, and
`unknown`. A bounded meta-Prolog memory can help it retain, inspect, and reuse
the chainable part of that representation without claiming to decide arbitrary
first-order logic or to replace LLM interpretation.

The causal question is therefore not “does Prolog solve ProverQA?” but:

> Given the same text and the LLM's own formalization, does an executable,
> provenance-bearing chain memory reduce lost or contradicted intermediate
> chains relative to an equally budgeted non-executing structured-memory
> control?

## Scope and semantic boundary

The agent-authored semantic layer is deliberately richer than the executable
fragment. It accepts a closed AST containing `atom`, `neg`, `and`, `or`, `xor`,
`implies`, `forall`, and `exists`, all tied to English source spans. This AST
is returned verbatim to the LLM on Turn 2 in M1 and M2. It is the LLM's own
working representation, not a benchmark-supplied FOL formula and not a claim
that the runtime decides those operators.

The executable meta-Prolog projection is deliberately finite and explicit:

- signed ground facts: `fact(Id, positive|negative, Atom, Provenance)`;
- forward rules with a conjunctive body and one signed head;
- a finite, case-local entity domain;
- bounded forward closure, cycle detection, proof provenance, and explicit
  `unknown` when neither requested signed literal is derivable.

This is **not** a general FOL theorem prover. The LLM retains responsibility
for interpreting its own semantic AST: quantifier scope, XOR/OR semantics,
non-Horn constructs, and deciding which Horn-like chains are worth entering
into memory. The runtime never interprets absence as classical negation.

## Held-out task source

ProverQA `dev/hard` remains a source of original English worlds, questions,
and hidden benchmark labels. Its `nl2fol`, `conclusion_fol`, source answer,
and any source proof are scorer-only artifacts: they must never be supplied to
the LLM, its formalizer, or the meta-Prolog runtime.

The initial fixture is a fresh, deterministic 12-case balanced selection.
Historical source ids and raw directories from `proverqa-hard-hybrid-v1` are
not reused. Before collection, a small hand-audited diagnostic subset must
confirm that the agent-authored terms refer to the intended English facts and
rules; this audit is reported separately from benchmark correctness.

## Fixed two-pass conditions

All conditions use the same model, temperature, source text, final answer
schema, one attempt per stage, and the same two LLM turns. Neither stage sees
benchmark gold.

| Condition | Turn 1 | Between turns | Turn 2 |
| --- | --- | --- | --- |
| M0 natural scratch | LLM writes a plain-language working note and tentative chain hypotheses | no executable action | LLM reads its note and answers A/B/C |
| M1 structured scratch | LLM emits a validated semantic-AST plus signed-fact/rule/hypothesis JSON plan | JSON is retained verbatim; no inference | LLM reads its own semantic AST and chain plan, then answers A/B/C |
| M2 meta-Prolog memory | exactly the M1 JSON schema | deterministic runtime validates the chain projection, computes bounded closure, and returns only proofs/conflicts/unknown for the agent-selected goals | LLM reads its own semantic AST, chain plan, and runtime evidence, then answers A/B/C |

M1 versus M2 is the primary comparison: both get an extra LLM turn and the
same self-authored formal memory; only M2 gets executable chain evidence.
M0 is a secondary baseline for the cost or benefit of imposing structure.

## Agent-authored plan contract

Turn 1 may produce only:

```json
{
  "semantic_forms": [{
    "id":"s1",
    "ast":{"op":"forall","var":"x","body":{"op":"implies","left":{"op":"atom","name":"calm","args":["x"]},"right":{"op":"atom","name":"ready","args":["x"]}}},
    "source_spans":[2]
  }],
  "facts": [{"id":"f1","polarity":"positive","atom":"calm(ada)","source_spans":[1]}],
  "rules": [{"id":"r1","body":["calm(ada)"],"head":{"polarity":"positive","atom":"ready(ada)"},"source_spans":[2]}],
  "goals": [{"id":"g1","polarity":"positive","atom":"ready(ada)","why":"tests the readiness chain"}]
}
```

The collector validates the closed semantic-AST grammar, closed atom grammar,
unique ids, finite size limits, groundness of the executable projection,
references to source-span indices, and a maximum of three distinct goals. It
does not accept arbitrary Prolog code, a filesystem path, shell command,
source gold, or a query created after runtime feedback.

For M2 the LLM must choose one to three of its own declared goal ids in Turn
1. The runtime executes those goals before Turn 2. A plan with zero goals,
an invalid term, duplicate goal, invalid source span, or tool/runtime failure
is `protocol-invalid` and is never silently repaired or retried.

## Meta-Prolog output contract

For each selected goal, the runtime returns only a sealed record:

```json
{
  "goal_id":"g1",
  "status":"entailed|contradicted|unknown|conflict|budget_exhausted",
  "proof":{"fact_ids":["f1"],"rule_ids":["r1"]}
}
```

The output must bind to only facts/rules from the Turn-1 plan. It must retain
all derivation parents, terminate under a fixed depth/node budget, and report
the budget boundary rather than inventing a negative conclusion.

## Measurements

Primary, reported separately by condition:

1. benchmark-answer correctness among protocol-valid final answers;
2. protocol validity and malformed-plan rate;
3. chain-retention score on preannotated diagnostic probes: whether an
   intermediate fact required for the final answer appears in the LLM's
   declared or cited chain;
4. unsupported-chain rate: cited fact/rule/proof edge absent from Turn-1 plan
   or runtime evidence;
5. conflict/unknown handling, including false conversion of absence to
   negation.

Benchmark gold is not a proof of the agent formalization. A stratified sample
of Turn-1 plans receives blinded human audit for text-to-plan faithfulness;
that audit and final correctness remain distinct measurements.

## Invalidation and reporting

- No model retries, answer replacement, source-sidecar repair, or pooling with
  `proverqa-hard-hybrid-v1` are permitted.
- M2 may not claim a proof beyond its self-authored finite Horn fragment.
- Report denominators, raw traces, plan hashes, runtime receipts, and model
  token usage for every stage.
- A single collection is an operational observation, not evidence of a causal
  advantage. Any apparent M2 effect requires an independent fresh run.

## Non-goals

- A complete first-order theorem prover.
- Treating `nl2fol` as an LLM-generated translation.
- Evaluating MemConflict in this wave.
- Claiming that an LLM-generated rule is true in the external world merely
  because the meta-Prolog runtime can execute it.
