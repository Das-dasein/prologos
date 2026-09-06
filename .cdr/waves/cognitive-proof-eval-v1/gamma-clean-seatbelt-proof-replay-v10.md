# Gamma CDR scaffold — issue #76: clean proof-consumption replay

## Experimental question

This is a replay of the **proof-consumption** question, not the later
agent-driven-Prolog-tool question:

```text
P0 = sealed task condition without trusted proof result
P1 = matched sealed task condition with existing trusted Prolog proof DAG
     or bounded missing-goal result
```

The answering model need not author or run Prolog in this cycle. The trusted
result is the specific input whose use is under observation.

## Why a new protocol is required

The prior v9 raw artifact is transport-valid but contaminated by tool reads of
repository, memory and evaluator data. It cannot be reused for answer-quality
or P0/P1 interpretation.

## Alpha scope

Build a separate future live collector that composes the reviewed v10 Seatbelt
preflight with the existing proof-condition assembly. Keep v7-v9 unchanged.

- The process starts in a fresh sealed root using Codex `-C`,
  `--skip-git-repo-check`, `--ignore-user-config`, and Codex `read-only` mode.
- Outer Seatbelt remains default-deny and permits only its closed runtime
  roots, one exact auth-file exception, sealed inputs and declared outputs.
- Do not expose repo, `MEMORY.md`, datasets, evaluator/hidden contracts, raw
  archives or outside-root writes. Actual offline denial probes are mandatory.
- P1 continues to receive only the already trusted proof/missing-goal object;
  no new AST, no full-Prolog thought tool, no dynamic rule admission.
- Preserve raw JSONL and record whether any tool event occurred. The run must
  fail closed if a prohibited path is exposed or if an observable tool event
  accesses undeclared material.

## Interpretation boundary

No paid call occurs in alpha/beta/CI. A later user-authorized run may only be
called a clean diagnostic candidate after raw inspection. It is not a result,
effect size or superiority claim by default. Auth-file visibility to child
tools remains an accepted credential-surface limitation, not evaluative
content or an assertion of complete hermeticity.
