# Semantic branch dream — CDR pre-registration v0.1.1

Changelog:

- v0.1.1 — separated post-hoc Luna30 diagnosis from the prospective sample and
  made the no-auto-repair boundary executable in the branch schema.
- v0.1.0 — initial pre-registration draft.

## Status

`PREREGISTERED — NOT RUN`. This is a bounded formalization-sensitivity study.
It does not test PAM-C1, long-term memory usefulness, or whether an LLM has
understood the world.

## Question and claim

**SBD-C1 (`hypothesized`):** For a frozen model-produced finite-FOL candidate,
a model can propose at most two source-grounded alternative complete candidates
whose deterministic execution distinguishes a stable answer from one dependent
on a named semantic assumption.

A useful result is a calibrated trace, not a repaired answer. The study does
not claim that any alternative is true, that it should replace the baseline,
or that answer accuracy improves.

**Falsifier:** SBD-C1 fails for the evaluated sample if the generator cannot
emit a schema-valid source-grounded branch for a predeclared ambiguity, or if
the branch executor cannot reproduce the recorded baseline and every accepted
complete branch in a fresh process.

## What is being tested

Each task starts with only its displayed English world and question. The model
first emits one immutable `program + query` candidate. A second bounded request
may emit zero, one, or two branch hypotheses in
`branch-hypothesis-schema-v1.json`.

The executor makes a complete candidate for each branch, hashes it, and runs it
in a fresh SWI-Prolog process. It returns a `dream-trace` with one of:

- `stable` — every executable branch has the baseline outcome;
- `branch_dependent` — at least one executable branch differs;
- `unresolved` — no valid branch was proposed or a branch cannot execute;
- `rejected_hypothesis` — the schema or source-span check rejects the branch.

`branch_dependent` means only that the answer relies on a recorded assumption.
It does not select the alternative and must not be converted into a fact,
Prolog rule, alias, or final answer automatically.

## Allowed hypotheses

The schema permits only these fixed, source-cited changes:

1. `connector_interpretation`: replace one labelled source formula's `or` with
   `xor`, or the reverse, when the cited wording explicitly leaves that
   distinction open.
2. `predicate_alias`: replace one predicate spelling in the query with a
   same-arity predicate already present in the program. This is a suggestion,
   never automatic autocorrect.
3. `missing_type_assumption`: add one explicit unary type fact only when the
   source itself states that membership. It is an assumption, not recovered
   knowledge.

The branch proposal must quote the exact numbered source sentence and name its
single operation. It cannot use scorer-only fields, arbitrary Prolog text,
`consult`, `call`, `assert`, `retract`, filesystem, network, or a loop of
repairs. A branch is a full immutable candidate, not a mutation of a running
program.

## Sample and blinding

- **Prospective sample:** 12 previously uninspected ProverQA records, selected
  and hashed before any model output is read.
- **Generator input:** displayed `story`, `question`, and numbered sentences
  only.
- **Withheld from the generator:** `nl2fol`, reasoning, conclusion formula,
  gold answer, and all post-hoc Luna30 probes.
- **Blind evaluator input:** frozen candidates, branch traces, and the source
  text. Gold is unsealed only after schema, provenance, and execution checks.
- **Historical Luna30:** may be cited only as motivation and regression
  fixtures. Its outcomes do not contribute to SBD-C1 metrics.

The run manifest must pin the dataset hash, selected IDs, source commit, model,
provider adapter and base-prompt hashes, sampling parameters, timeout, and raw
machine-readable outputs. A fresh beta session reproduces the artifact from a
clean copy before any observed or computed claim is issued.

## Measures and decision

Primary computed measures, reported with denominators:

1. schema-valid, source-grounded hypothesis rate;
2. baseline reproduction rate;
3. branch reproduction rate;
4. stable / branch-dependent / unresolved / rejected distribution;
5. blind-review agreement that a cited sentence actually supports the stated
   ambiguity.

Gold-answer change and final-answer accuracy are exploratory annotations only.
They cannot support a claim of improvement because a branch condition spends
additional inference budget and deliberately exposes counterfactual context.

`GO` for the bounded engineering diagnostic requires 100% baseline and accepted
branch reproduction plus no prohibited operation. Otherwise the diagnostic is
`REVISE` or `INDETERMINATE`. No outcome authorizes a memory write or an answer
override.

## Roles and exit

Fresh CDR alpha produces the run. Fresh CDR beta, distinct from alpha, checks
selection blinding, hashes, schema, clean reproduction, and claim calibration.
Gamma records a receipt only after both artifacts exist. A negative or
indeterminate result is a valid close-out.

## CLP check

- **Pattern:** execute alternatives to expose dependency, never to silently
  repair a formalization.
- **Relation:** Prolog supplies deterministic branch evidence; the model only
  proposes bounded hypotheses; beta controls the conclusion.
- **Exit:** zero valid hypotheses is an allowed `unresolved` result, and the
  entire wave may close without a positive claim.
