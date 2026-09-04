# Gamma scaffold: cycle 18

Issue: GitHub #18, `CDD: record lucid dreaming as bounded reflective
simulation`.
Branch: `cycle/18`.
Mode: small design clarification.
Actor arrangement: γ=δ authored the proposal under an explicit operator
request; this is not a runtime implementation cell and has no α code payload.

## Selected gap

The epistemology proposal distinguishes Reflection, Elenchus and trusted
memory, but does not name the controlled counterfactual simulation in which an
agent can execute a pinned model snapshot without acting on trusted state.

## Expected surface and scope

Only `.cdd/agent-epistemology-v0.md` changes. The new term must be explicitly
proposal-only; no runtime, evaluator, provider, CDR method/dataset/claim,
trusted Prolog rule, registry, memory or issue #17 surface may change.

## Review oracle

Beta verifies that the document:

1. distinguishes Lucid Dreaming from Reflection and durable assertion;
2. names immutable inputs, bounded sandbox and allowed `dream-trace` outputs;
3. forbids direct trusted-memory/rule/registry mutation and arbitrary Prolog
   effects;
4. says the meta-interpreter and its DSL are future debt, not shipped code;
5. contains no accidental CDR, live-model or consciousness claim.

## Dispatch constraints

- β uses the canonical CDD/β/review load order and writes a verdict artifact
  only; it does not edit the proposal or merge the branch.
- A REQUEST CHANGES verdict returns the documentation correction to a fresh
  alpha/design-author session; β does not repair it.
- APPROVE is limited to the proposal's wording and boundaries, not evidence
  that lucid dreaming works or that an agent is conscious.
