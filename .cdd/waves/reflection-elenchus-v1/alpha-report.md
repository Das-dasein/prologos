# Alpha report: reflection-elenchus-v1

## Delivered

- `reflection-hypothesis-v1` is a strict record containing a proposed rule,
  at least one supporting assertion ID, and a hash-bound registry identity.
- `hypothesis-elenchus.js` resolves the named support against a supplied memory
  snapshot, rejects malformed/unknown hypotheses, marks unsafe support as
  `conflicted`, and searches active negative assertions for exact derived
  conclusions before candidate execution.
- Only a candidate with safe support, a derivable conclusion, and no known
  counterexample is passed to the existing disposable ontology runner.
- Result JSON includes registry identity, memory SHA-256, sorted supporting and
  refuting IDs, decision, and candidate result when execution occurred.
- `elenchus-cli.js` exposes a read-only local entrypoint.

## Focused evidence

```text
node test-elenchus.js  PASS
npm test               PASS
npm run test:cdr-gold  PASS, 12/12
git diff --check       PASS
```

The focused cases cover an accepted proposal, a matching negative
counterexample that prevents execution, superseded and reviewed support that
become `conflicted`, malformed no-evidence input, deterministic repeat, and
byte-identical fixture memory before/after evaluation.

## Limits and beta handoff

This is deterministic engineering evidence only. It does not show that an LLM
can formulate useful hypotheses, that the snapshot is complete, or that a
counterexample search proves a rule true. The parser is intentionally bounded
to atom-only assertion propositions and the currently declared rule subset.
An independent beta must inspect the issue #11 contract, rerun the commands,
and check that a rejected hypothesis cannot reach the runner or mutate trusted
memory/registry.
