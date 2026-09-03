# Beta R2 report: ontology-mvp-v0

## Verdict

**REVISE. Do not pin this commit as the CDR F3 dependency.**

The repaired paths pass their focused checks, but the extensible registry
reopens the runtime boundary for caller-supplied declarations. A fresh beta
audit therefore does not establish the immutable-core and fail-closed
requirements for the advertised generic path.

## Scope and source

- Audited commit: `941b8233d84837153577221a6757e40ecc66be59` (`941b823`).
- Read: `manifest.md`, `status.md`, `gamma-spec.md`, and
  `alpha-repair-report-r2.md`.
- Audited implementation/test files in that commit:
  `ontology-harness.js`, `ontology-runner.pl`, and
  `test-ontology-harness.js`.
- No source, test, memory, CDR, dataset, oracle, or threshold file was
  modified. This report is the only artifact added by this audit.

## Commands and results

```text
node test-ontology-harness.js       # ontology-harness ok
npm test                             # ok; memory-store ok; codex-provider ok
git diff --check 941b823^ 941b823   # clean
git rev-parse HEAD                   # 941b8233d84837153577221a6757e40ecc66be59
swipl --version                      # SWI-Prolog 10.0.2 arm64-darwin
```

The focused tests confirm the repaired successful-but-unrelated rule is
excluded from supporting rules, rejected results preserve a recoverable
`candidate_version` (and use `null` for malformed JSON), and missing SWI is
reported as path-free `SWIPL_NOT_FOUND`. The generic declared registry also
executes a non-employment `connected_to/2` -> `socially_connected/1` rule;
the same proposal is rejected when the registry is not supplied.

The default candidate was run in a fresh temporary directory and the
durable/trusted files remained byte-identical (the audited commit and tests
also leave the worktree clean apart from this report). The runner's fixed
query names prevent an arbitrary model-controlled goal string. The tested
provenance join is answer-scoped for the returned default derived answer;
support records are keyed by derived predicate and bound arguments. Error
normalization is deterministic and path-free for the tested missing-binary
case. Timeout/non-zero execution returns empty answers by construction, but
the checked-in focused test does not independently exercise both fake-worker
paths required by the gamma acceptance list.

## Blocking finding

`createPredicateRegistry()` rejects only the small `IMMUTABLE_CORE` set,
which contains `ontology_support` but not the harness-owned
`ontology_derived`, runner dispatch predicates, or Prolog control/system
predicates. A direct probe showed that a custom declaration such as
`{name: "ontology_derived", arity: 1, kind: "base"}` is accepted. A
proposal can therefore emit clauses for the runner's trusted
`ontology_derived/2` adapter predicate (and declarations such as `consult/1`
are also admitted by the generic registry). This violates the contract's
immutable-core protection and its requirement that payloads containing
`consult`, `assert`, `retract`, `call`, `use_module`, `:-`, shell/path text, or
cut be rejected as data before SWI execution. The current default registry
does not expose this issue, but the repaired feature explicitly advertises a
caller-supplied domain-neutral registry.

Repair must use one complete reserved runtime/system predicate set for every
registry declaration and term, reject those names during validation, and add
regression tests for `ontology_derived`, `consult`, `assert`, `retract`,
`call`, and `use_module` through both an injected and proposal-declared
registry. Re-run the full independent beta audit afterward.

## Non-blocking limitations

- `active_claims`, `conflicts`, and `provenance` remain registered empty
  fixture paths; ontology facts are not claim records and no source-claim
  provenance is produced.
- The generic runner returns a flattened answer representation and one sorted
  rule list, rather than a per-answer provenance object. This is sufficient
  for the tested single-answer case but should be made explicit before using
  multi-answer results as evidence.
- This is synthetic engineering evidence only; it does not validate CDR F3,
  ontology quality, or product utility.

## Pin decision

**Not approved for pinning.** Pin only a successor commit after the complete
runtime reservation boundary is enforced and the missing timeout/non-zero
fake-worker acceptance coverage is independently demonstrated.
