# Gamma specification: ontology-mvp-v0

Status: proposal for alpha implementation. This is a CDD engineering
contract; it is not evidence for PAM-C1--C4 and does not change the pending
CDR F3 method or its thresholds.

## Boundary and deliverables

The slice accepts one JSON proposal, validates it fail-closed, compiles it
into a temporary candidate program, and runs a small set of pre-registered
queries in a fresh SWI-Prolog process. The candidate is disposable. No
proposal may append to `data/memory.pl`, rewrite `memory.pl`, read a path, or
invoke a process. Alpha may add the validator/harness and tests, but must not
alter the CDR dataset, oracle, scoring, provider settings, or thresholds.

The existing `swipl-engine.js`/`swipl-runner.pl` is a starting adapter only:
its current command-line goal argument is not itself an accepted public API.
The harness must map query names to fixed goal templates and must never pass a
model-controlled goal string to SWI.

## Pinned proposal JSON contract (v0)

The complete proposal is one JSON object (no JSONL framing inside the object):

```json
{
  "schema_version": "ontology-proposal-v0",
  "candidate_version": "cand-20260903-001",
  "registry": {
    "version": "predicate-registry-v1",
    "declarations": [
      {"name":"knows_technology","arity":2,"kind":"base"},
      {"name":"knows_multiple_programming_languages","arity":1,"kind":"derived"}
    ]
  },
  "facts": [
    {"predicate":"knows_technology","arguments":["user","python"]}
  ],
  "rules": [
    {
      "id":"r_knows_two",
      "head":{"predicate":"knows_multiple_programming_languages","arguments":["P"]},
      "body":[
        {"predicate":"knows_technology","arguments":["P","java"]},
        {"predicate":"knows_technology","arguments":["P","python"]}
      ]
    }
  ]
}
```

JSON Schema-level requirements are exact: no unknown keys; all fields are
required; `schema_version` is the literal string above; `candidate_version`
matches `^cand-[a-z0-9][a-z0-9._-]{0,63}$`; `facts` and `rules` are arrays of
at most 100 and 50 items respectively. A fact has only `predicate` and
`arguments`; a rule has only `id`, `head`, and `body`; `id` matches
`^r_[a-z0-9][a-z0-9_]{0,47}$`. Predicate names and atom names match
`^[a-z][a-z0-9_]*$`. Arguments are non-empty arrays of at most four strings;
an uppercase initial (`^[A-Z][A-Za-z0-9_]*$`) denotes a Prolog variable and
all other arguments are atoms. `_` is not permitted as an argument. A body
has 1--4 goals. Duplicate rule IDs are rejected.

The CDD core has no bundled domain predicate allowlist. A proposal must carry
an explicit `registry` with literal version `predicate-registry-v1` and
non-empty declarations, each naming an arity and `base` or `derived` kind.
This registry is the complete vocabulary for that candidate; a proposal
without it cannot use domain facts. Employment, education, and technology
predicates may appear only in explicitly declared test fixtures or the
separate legacy `memory-store.js` ingestion path. The old claim-ingestion
allowlist is not the CDD ontology registry.

Facts are positive typed propositions only in this contract; polarity, dates,
confidence, and source remain the separate claim-ingestion contract and are
not silently reinterpreted as ontology facts. Arity and base/derived status
come only from declarations in the candidate registry.

Rule predicates (head and body) must be in the proposal's registry. A rule
head may not be a claim,
`active_claim`, `conflict`, `supersedes`, or any Prolog/system predicate.

No fixture predicate has privileged status in the CDD core.

## Validator and compiler boundary

Validation order is deterministic and fail-closed: JSON parse and exact
schema; collection limits; identifier/atom/variable syntax; predicate and
arity allowlists; rule safety; then dependency/stratification checks. Any
error rejects the entire proposal, records a structured reason, and executes
nothing. Rejection is an audit event, not a partial acceptance.

For every rule, every variable in the head must occur in the body. Every body
variable must be bound by an earlier positive body goal (left-to-right); v0
has no negation, so this also makes all variables range-restricted. A rule may
have at most six distinct variables, four body goals, and a serialized source
size of at most 4096 bytes. Predicate arity is fixed by the registered
predicate table; facts and rule terms must match it. Atoms are emitted using
the same lowercase snake-case grammar, never interpolated raw JSON.

The compiler emits only generated facts/rules plus a read-only query adapter
in a fresh temporary directory. It emits no directives, module declarations,
consult/include/use_module, comments from the proposal, I/O, shell calls,
`call/1` or other meta-calls, cut, arithmetic, DCGs, assertions, retracts,
global variables, or filesystem paths. The trusted base rules are copied from
the pinned source snapshot; candidate definitions cannot replace a trusted
predicate (duplicate definitions are rejected). Temporary files are removed
after each run, including failure paths.

## Harness protocol

The harness receives `--proposal <file>` and a fixed query registry. A query
request names one of `active_claims`, `conflicts`, `derived`, or
`provenance`; its parameters are validated as atoms against the registry.
There is no arbitrary Prolog query option. Each run starts one fresh SWI
process, applies a wall-clock timeout (default 5000 ms, configurable only by
the pinned harness config), and captures stdout/stderr and exit status.

Every run writes one deterministic JSON record (stable key order and sorted
arrays) with this shape:

```json
{
  "schema_version":"ontology-result-v0",
  "candidate_version":"cand-20260903-001",
  "status":"ok",
  "answers":[{"query":"derived","bindings":{"P":"user"},"value":"..."}],
  "supporting_rules":["r_knows_two"],
  "supporting_claims":[],
  "error":null
}
```

`status` is exactly one of `ok`, `rejected`, `timeout`, or `swipl_error`.
`answers`, `supporting_rules`, and `supporting_claims` are always arrays;
`error` is null for `ok`, otherwise `{code,message}` with no stack or path.
For `rejected`, answers are empty and the error code identifies the first
deterministic validator failure. For timeout/non-zero exit, no answer is
trusted. Supporting claims/rules are derived by the harness, sorted by ID,
and must not be invented by the LLM. The same proposal, pinned base, and
query set must produce byte-identical result JSON.

For pending CDR F3, the external evaluation harness may invoke this adapter
only through an immutable commit/archive identifier and must retain raw
JSONL, config, provider/model/prompt IDs, token-budget sentinels, and source
hashes required by `prolog-memory-evaluation-v1.md`. This CDD harness does
not run live-model evaluation and does not report product utility.

## Acceptance tests

Alpha must add deterministic tests for all of the following:

1. The example proposal is accepted; one derived answer contains
   `r_knows_two` support and expected bindings.
2. Unknown key, malformed JSON, unknown predicate, wrong arity, bad atom,
   lowercase variable, duplicate rule ID, head-only variable, unbound body
   variable, body over four goals, over six variables, and source over 4096
   bytes are rejected without spawning SWI.
3. Payloads containing `consult`, `assert`, `retract`, `call`, `use_module`,
   `:-`, shell/path text, or a cut are rejected as data and never executed.
4. A query registry miss is rejected; a registered query returns sorted,
   deterministic JSON and cannot access an arbitrary goal.
5. A SWI non-zero exit and a forced timeout each return their structured
   status, empty answers, and no uncaught exception.
6. Running the same candidate twice yields identical result JSON; temporary
   candidate execution leaves the durable memory file and trusted `memory.pl`
   byte-identical.
7. Existing `npm test` remains green.

Tests should use a temporary fixture directory and a fake SWI executable for
timeout/exit paths where practical; they must not depend on network, a live
LLM, or the CDR pilot outputs.

## Handoff checklist for alpha

- [ ] Implement the exact contract and allowlists above; document any needed
  arity table without broadening predicates.
- [ ] Keep validation, compilation, execution, and result normalization as
  separately testable boundaries.
- [ ] Ensure model text cannot select a query, process, path, or Prolog term.
- [ ] Add the acceptance tests and run `npm test` plus the focused harness test.
- [ ] Record SWI version, command/config, source SHA, and deterministic fixture
  outputs in the alpha report.
- [ ] State explicitly which behavior remains absent from the current wrapper
  (notably arbitrary goal parsing and temporary-directory cleanup) until fixed.
- [ ] Do not edit `.cdr/methods/prolog-memory-evaluation-v1.md`, its dataset,
  oracle, thresholds, or claim status.
- [ ] Return to beta a diff, test commands/results, sample accepted result,
  sample rejection records, and a list of known limitations.

Gamma boundary decision: **BOUNDED-GO for alpha implementation**, contingent
on the exact validator/query boundaries and the acceptance tests above. This
decision authorizes no CDR receipt or research claim.
