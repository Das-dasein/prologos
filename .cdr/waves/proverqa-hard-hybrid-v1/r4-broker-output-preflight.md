# r4 broker-output preflight

Status: `local transport preflight; no model call; not a CDR receipt`.

The r3 raw audit found that SWI-Prolog executed but its `BROKER_RESULT` was
redirected only to a private receipt file. r4 changes the sealed script so it
writes the same one-line result to the receipt and to native command stdout.
The P2 prompt explicitly tells the model that this command output is its only
bounded chain result.

On the pinned `dev/hard` source file, all 12 generated r4 broker scripts were
executed locally with SWI-Prolog. Each exited successfully and had exactly
matching stdout and receipt values:

- `entailed`: source cases 22 and 373.
- `unknown`: source cases 96, 179, 185, 200, 213, 267, 304, 327, 348, 368.

This proves only the revised local transport property: a future Codex P2 call
can observe the bounded result and an audit can bind it to the receipt. It does
not execute Codex, score a model, verify full ProverQA FOL semantics, or
establish that the selected subgoal is useful to the answer.

The last limitation is material. A future `P2-multicall` must be a separate
preregistered condition, with a finite model-visible catalog of distinct
sealed subgoals, an explicit 1..K call budget, no repeated script, exact trace
validation, and its own raw directory and denominator. Merely allowing repeats
of r4's single subgoal would not make it a more informative solver condition.
