# Local implementation validation — v0.1.1

Changelog:

- v0.1.2 — recorded the successful recovery of the standard isolated executor.
- v0.1.1 — recorded the sandbox-limited integration result instead of treating
  an unavailable executor as a passing Prolog run.
- v0.1.0 — initial validation note.

## Artifact

`semantic-branch-dream.js` implements the wave's disposable branch executor.
It accepts a baseline and a maximum of two schema-shaped hypotheses, creates a
complete candidate for each, and invokes the existing immutable-candidate
checker. It returns a `dream-trace-v1`; it has no write path to memory, a
baseline program, or an ontology registry.

## Checks performed on 2026-09-09

Passed locally:

```text
node --check semantic-branch-dream.js
node --check test-semantic-branch-dream.js
JSON.parse(.cdr/waves/semantic-branch-dream-v0/branch-hypothesis-schema-v1.json)
```

The static checks also exercised a source-cited `or → xor` complete-candidate
transformation, diagnostic-status parsing, and candidate hashing.

The product-isolation integration command is intentionally retained:

```text
npm run test:semantic-branch-dream
```

It could not execute in this Codex filesystem sandbox. The existing isolated
Prolog runner returned `sandbox-exec: sandbox_apply: Operation not permitted`,
so the checker correctly returned `execution_outcome: unreported`. This is an
environment restriction, not a semantic result, and is not recorded as a
passing run. A clean environment where the project's normal `runThought`
isolation is permitted must run this command before a CDR alpha run.

On 2026-09-09 after the workspace access policy was restored, the standard
command passed in this repository. A minimal immutable candidate also returned
`execution_outcome: succeeded` and an `entailed` labelled explanation through
the same checker. The earlier host restriction is retained as provenance of a
failed environment check, not as the current execution state.

The separate direct semantic check uses the same finite-FOL module but does not
exercise the product sandbox wrapper:

```text
npm run test:semantic-branch-dream:direct
```

It can confirm the bounded candidate transformations' Prolog effect. It cannot
establish isolation behavior or replace the standard integration check.

On 2026-09-09 this direct check passed: the OR baseline was `unknown` and its
XOR branch `contradicted`; the query-only spelling mismatch baseline was
`unknown` and its alias branch `entailed`. Both traces were labelled
`branch_dependent`; neither was used to amend a program or answer.

## CLP check

- **Pattern:** static evidence establishes syntax and bounded transformation;
  it does not stand in for solver execution.
- **Relation:** the implementation reuses the existing immutable-candidate
  checker instead of inventing a second Prolog execution path.
- **Exit:** if isolation cannot run, the wave stays `NOT RUN`; no trace or
  CDR claim is emitted.
