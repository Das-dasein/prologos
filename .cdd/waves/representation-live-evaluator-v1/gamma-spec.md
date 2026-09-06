# CDD γ specification: representation-live-evaluator-v1

## Problem

The approved generator establishes paired, solver-free P0/P1 prompts and
ground-truth labels, but it does not invoke an answering model or retain raw
paired evidence. A live evaluator is required before CDR can measure RFR-C1.

## Scope

Implement a live evaluator that consumes only the immutable representation
fixture and makes one answering request per P0/P1 condition. It must be safe
to test entirely with an injected fake provider and must require an explicit
live opt-in for any real provider invocation.

### Implementation contract

| Axis | Pinned value |
| --- | --- |
| Language | Node.js/CommonJS |
| CLI integration target | New standalone npm script; no chat-runtime modification |
| Package scoping | Root evaluator/test files and CDR wave documentation only |
| Existing-binary disposition | No existing provider or trusted-proof evaluator is replaced |
| Runtime dependencies | Existing `providers/openai-answering.js`; no tool-capable transport in P0/P1 v1 |
| JSON/wire contract | Versioned local run manifest and per-call artifacts under an explicit fresh absolute raw root; never commit raw outputs |
| Backward compatibility | Do not modify `trusted-proof-*`, `cognitive-proof-eval-v1`, generator semantics, or existing CDR receipts |

## Acceptance criteria

1. The evaluator reads a fixture whose SHA-256, schema version, case count,
   and 24-stratum coverage are checked before any provider construction.
2. It submits exactly 48 requests: P0 and P1 once per case. Case order is
   deterministic and counterbalanced: 12 cases use P0→P1 and 12 P1→P0.
3. A provider receives only the already-assembled prompt string. The P0/P1 v1
   live transport is `openai-api` Responses with no tool declaration,
   function-calling surface, filesystem, shell, or Prolog capability. A
   Codex-exec transport is explicitly out of scope for this solver-isolation
   baseline.
4. Live collection requires all of: `--allow-live-provider`, an explicit
   model, complete fixed sampling/retry configuration, and a fresh absolute
   raw root. Without that flag, the CLI performs only offline validation and
   makes zero provider calls.
5. Every local record contains fixture/prompt hashes, case id, condition,
   counterbalanced order, raw response file reference/hash, provider-native
   usage, model, sampling/retry identity, parsed answer, and a deterministic
   format/content score against the local oracle. Raw artifacts are created
   with exclusive writes and restrictive permissions.
6. Answer parsing accepts only exactly `RESULT: entailed` or
   `RESULT: unknown` (apart from terminal newline). Any other response is a
   format failure and is retained as raw evidence, not repaired by the
   evaluator.
7. The evaluator writes an aggregate explicitly marked
   `not-a-cdr-receipt`: per-condition denominators, correctness counts, paired
   disagreements, input/output token totals, fixture/config hashes, and all
   invalid/missing records. It makes no superiority or causal claim.
8. Focused tests with a fake provider prove 48 calls, ordering, no-live default,
   strict parsing, append-only raw writes, fixture/config binding, and that
   no P0/P1 prompt contains proof/oracle/result/tool/engine material. `npm
   test` remains green.

## Proof plan

- Unit-test the evaluator with a fake provider that records only the prompt it
  receives; assert all 48 prompts are byte-identical to the fixture's stored
  P0/P1 prompts and lack solver surfaces.
- Test a malformed answer and an existing raw root as fail-closed paths.
- Test the no-opt-in CLI/programmatic path has zero provider calls.
- Run focused test then `npm test`.

## Non-goals

- No live run during implementation or test.
- No Codex CLI, shell, file, or Prolog tool surface for P0/P1.
- No P2, length-normalized ablation, statistical inference, or CDR receipt.
- No modification of the generator or historical trusted-proof evaluator.
