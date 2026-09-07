# CDR wave manifest: proverqa-hard-hybrid-v1

Status: `hypothesized`. This is a prospective method and fixture-preflight
wave. It makes no live-provider request and establishes no effectiveness claim.

## Research question

On a small, fixed selection from ProverQA `dev/hard`, what changes when the
same hard logical world is supplied as natural language (P0), as lossless
Prolog terms (P1), or as those Prolog terms with a bounded chain-solver
capability (P2)?

`P2-hybrid` is deliberately separate from a complete solver condition: the
model itself interprets quantified and non-Horn formula structure, then may
ask the broker only about a predeclared finite chain subproblem. It measures a
hybrid decomposition, not full first-order theorem proving.

## Fixed conditions

| Condition | Model-visible material | Permitted computation |
| --- | --- | --- |
| P0 | ProverQA context and original question | none |
| P1 | Lossless Prolog-term encoding of the same formulas and the identical question | none |
| P2 | P1 material | one private, predeclared SWI-Prolog chain broker call |
| P2-hybrid | P1 material for the six marked quantified cases | one such broker call; quantifier/non-Horn decomposition remains model work |

P0 and P1 must never contain source gold, source reasoning, a proof, a solver
result, or tool instructions. P2/P2-hybrid broker receipts are private raw
evidence, never P0/P1 input.

## Fixture and gold gates

The fixture selects exactly 12 hard cases: four source `A` (true), four `B`
(false), and four `C` (uncertain), using a SHA-256-ranked deterministic seed.
Six marked hybrid cases must contain `forall` in their parsed formula terms.

Each selected record preserves the source id, original English context,
original question, source answer, source-file SHA-256, and every source
`nl2fol` formula. The preflight rejects malformed formulas and any selection
that cannot satisfy the answer or quantified-case balance.

Source gold is a benchmark label, not yet a verified local Prolog result. A
future broker implementation must add a separate semantic compiler check. If
the compiler result disagrees with source gold, the record is `compiler-fail`;
it is excluded from comparative scoring rather than silently relabelled.

## Claims and non-goals

The only prospective claim is that the named conditions can be collected and
audited under equal model, sampling, budget, and one-attempt policy. No result
can establish a Prolog advantage without a fresh CDR alpha collection and an
independent beta reproduction.

Non-goals: run MemConflict; rerun historical representation fixtures; claim a
full ProverQA-hard score; treat P2-hybrid as a complete FOL solver; expose a
general shell, path, program, or query to the model.
