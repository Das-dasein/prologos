# Beta report: ontology-mvp-v0

## Verdict

**REVISE.** The implementation is a useful isolated prototype, but it is not
yet suitable as a pinned dependency for CDR F3. The validator and process
boundary pass the basic safety checks, while provenance and query error
semantics do not satisfy the pinned contract.

## Commands and observed results

Run from the repository root (`/Users/artem/Documents/code/prolog-agent-memory`):

```text
node test-ontology-harness.js
```

Result: `ontology-harness ok`.

```text
npm test
```

Result: passed (`ok`, `memory-store ok`, `codex-provider ok`).

```text
swipl --version
```

Result: SWI-Prolog `10.0.2` for `arm64-darwin`.

Focused independent checks also confirmed:

- malformed JSON, unknown keys/predicates, wrong arity, invalid arguments,
  lowercase/unbound/head-only variables, duplicate IDs, body-length and
  dangerous predicate payloads are rejected before SWI execution;
- a missing query registry key is rejected;
- a missing SWI executable returns `status: "swipl_error"` with empty answers;
- a forced 1 ms run returns `status: "timeout"` with empty answers;
- repeating the same accepted proposal produced byte-identical normalized
  JSON; `memory.pl` and `data/memory.pl` SHA-256 values were unchanged, and the
  temporary `pam-ontology-*` directory was removed.

## Findings

### 1. High: supporting rule provenance is fabricated / over-inclusive

`run()` uses every rule whose head is in `DERIVED` when the runner returns no
supporting rules. It does not check which rules actually participated in the
answer. An accepted proposal containing `r_ok` (which derives the answer) and
an unrelated `r_irrelevant` (requiring `rust`) returned:

```json
"supporting_rules": ["r_irrelevant", "r_ok"]
```

The contract requires supporting rules to be derived by the harness and not
invented by the model. This must be fixed before F3 can rely on provenance.

### 2. Medium: registered query plus parameters becomes an uncaught SWI-level
error record

The validator accepts atom parameters for every registered query, but
`ontology-runner.pl` only implements the empty-parameter forms. For example,
`{ "query": "active_claims", "parameters": ["x"] }` returns
`status: "swipl_error"` / `SWIPL_EXIT` with SWI's path-bearing error text.
This is not a deterministic query-registry rejection or a registered query
result, and the message can expose an implementation path. Define and enforce
the parameter schema for each query (or reject non-empty parameters before
spawning SWI) and normalize the result deterministically.

### 3. Medium: candidate rules may redefine base relations

The validator accepts a rule with a base predicate as its head, for example:

```prolog
knows_technology(P,java) :- knows_technology(P,python).
```

The gamma contract says candidate definitions must not replace trusted
predicates and duplicate definitions must be rejected. The current compiler
does not copy a trusted base snapshot or enforce this boundary. Either make
the trusted snapshot explicit and reject collisions, or restrict candidate
rule heads to the registered derived predicates and document the exact
contract change.

## Safety assessment

The current term grammar, fixed arities, rule limits, source-size limit, and
fresh temporary candidate directory provide a good fail-closed baseline. No
proposal-controlled arbitrary goal string is forwarded to SWI, and the tested
failure paths leave durable memory unchanged. These positives do not offset
the provenance and query-contract findings for a CDR dependency.

## Required revision gate

Re-run this independent audit after fixing findings 1--3, add focused tests for
irrelevant-rule provenance and parameterized registered queries, then pin the
immutable artifact commit/archive and record its source hash in the CDR F3
receipt. Until then, this remains a synthetic engineering prototype and makes
no CDR utility or product claim.
