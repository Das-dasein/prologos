# CDR wave manifest: llm-metaprolog-chain-memory-v1

Status: `free-Prolog diagnostic observed; no benchmark collection`. This
supersedes neither the historical ProverQA P0/P1/P2 runs nor their artifacts.
It tests a different claim.

## Claim under test

The LLM is the semantic reasoner and formalizer: it interprets English,
writes ordinary Prolog, and chooses which hypotheses to ask about. Meta-Prolog
is a callable deterministic evaluator and provenance memory; it evaluates
finite-domain quantifiers and Boolean operators when the LLM chooses to invoke
it, rather than asking the LLM to simulate them in working memory.

The causal question is therefore not “does Prolog solve ProverQA?” but:

> Given the same text and the LLM's own formalization, does an executable,
> finite-domain, provenance-bearing predicate-logic execution reduce lost or
> contradicted intermediate chains relative to an equally budgeted
> non-executing structured-memory control?

## Scope and semantic boundary

The LLM-authored interface is ordinary Prolog source. There is no JSON AST and
no active declaration grammar. A trusted optional library exports
`finite_status/6`; it accepts Prolog terms describing a finite model and
returns an explicit status and certificate. The library's formula terms are an
API for a chosen call, not a replacement language for the rest of the agent's
program. The same source is returned verbatim to the LLM on Turn 2 in M1 and
M2. It is never a benchmark-supplied FOL formula.

When called, M2 grounds each quantifier over the declared typed domain, then
evaluates the supplied formulas under the locked profile in
[`finite-fol-profile-v1.md`](finite-fol-profile-v1.md). It returns a
derivation certificate, countermodel, open pair, or conflict certificate for
the LLM-selected goals.

This is complete only for the declared finite domain and locked semantic
profile, not arbitrary FOL over the real world. The LLM still owns English
interpretation, AST/domain construction, ambiguity policy, and hypothesis
selection. The runtime owns execution of `forall`, `exists`, `xor`, `or`,
`neg`, and `implies` after the AST has been accepted.

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
| M1 structured scratch | LLM emits a validated restricted Prolog logic program | Program text is retained verbatim; no inference | LLM reads its own program and answers A/B/C |
| M2 meta-Prolog memory | exactly the M1 Prolog source | deterministic runtime parses, grounds, and evaluates the program for the agent-selected goals | LLM reads its own program and runtime evidence, then answers A/B/C |

M1 versus M2 is the primary comparison: both get an extra LLM turn and the
same self-authored formal memory; only M2 gets executable chain evidence.
M0 is a secondary baseline for the cost or benefit of imposing structure.

## Diagnostic before a language lock

Before fixing an agent-language grammar, run a small **free-Prolog
diagnostic**. The agent receives only English context/question and is asked to
write ordinary Prolog facts, rules, helper predicates, and a query that it
believes answer a selected hypothesis. The observation is the raw program,
the query, SWI output, proof shape, and failure mode. It is not scored or
pooled with M0/M1/M2.

No semantic whitelist is imposed during that diagnostic. Its only hard limits
are process isolation, no host/network access, fixed CPU/memory/output limits,
and no model retry. These are safety and observability controls, not a claim
that the agent may use only Horn logic.

Only after inspecting the diagnostic programs may we version a minimal input
contract. The contract must be justified by observed failures or a stated
reproducibility need, rather than designed in advance for convenience.

## Deferred reproducibility contract

No restrictive language contract is active. If a later benchmark requires
reproducibility beyond raw ordinary Prolog, this is one possible declaration
format to test rather than impose:

```prolog
% source: [1]
domain(person, [ada]).
% source: [2]
axiom(s0, calm(ada)).
axiom(s1, all(person, x, implies(calm(x), ready(x)))).
goal(g1, ready(ada)).
```

This is a candidate reproducible contract, not an active restriction. If
adopted after broader diagnostics, the collector parses source as data and validates
the declaration set, predicate arity, finite typed domain, bounded formula
depth, variable binding, source-span comments, and a maximum of three goals.
The exact exclusions must be recorded with their diagnostic justification.

For M2 the LLM must declare one to three of its own goals in Turn 1. The
runtime evaluates those goals before Turn 2. A program with zero goals, an
invalid term, unbound variable, duplicate goal, invalid source span, or
tool/runtime failure is `protocol-invalid` and is never silently repaired or
retried.

## Meta-Prolog output contract

For each selected goal, the runtime returns only a sealed record:

```json
{
  "goal_id":"g1",
  "status":"entailed|contradicted|unknown|conflict|budget_exhausted",
  "certificate":{"kind":"derivation|countermodel|open_pair|conflict","form_ids":["s0","s1"]}
}
```

The output must bind only to the Turn-1 program. It must retain every
derivation parent or model valuation needed by the result, terminate under its
fixed budget, and report the budget boundary rather than inventing a negative
conclusion.

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
- M2 may not claim a proof beyond its self-authored finite domain and locked
  semantic profile.
- Report denominators, raw traces, plan hashes, runtime receipts, and model
  token usage for every stage.
- A single collection is an operational observation, not evidence of a causal
  advantage. Any apparent M2 effect requires an independent fresh run.

## Non-goals

- A complete first-order theorem prover over unbounded domains.
- Treating `nl2fol` as an LLM-generated translation.
- Evaluating MemConflict in this wave.
- Claiming that an LLM-generated rule is true in the external world merely
  because the meta-Prolog runtime can execute it.
