# Gamma specification: reflection hypothesis and Elenchus v1

Status: bounded CDD contract for GitHub issue #11.

## Hypothesis input

```json
{
  "schema_version": "reflection-hypothesis-v1",
  "hypothesis_id": "h_example",
  "decision": "proposed",
  "registry_identity": {"name":"example","version":"predicate-registry-v1","sha256":"..."},
  "registry": {"version":"predicate-registry-v1","declarations":[]},
  "supporting_assertion_ids": ["a_work"],
  "rule": {"id":"r_eligible","head":{},"body":[]}
}
```

The record must have at least one support ID, exactly one proposed decision,
one registry identity, and a rule accepted by the existing bounded ontology
validator. A malformed record, unknown support, invalid registry identity, or
unsafe rule is rejected before execution.

## Elenchus procedure

1. Pin and hash the input memory snapshot.
2. Resolve each named support assertion. It must be positive, accepted,
   non-superseded, and free of an explicit direct conflict.
3. Evaluate the bounded rule over only those support propositions in memory.
4. Search active negative assertions for an exact derived proposition.
5. If a counterexample exists, emit `rejected` and its assertion IDs. If a
   named support is conflicting, superseded, or not accepted, emit
   `conflicted`. If no conclusion is derivable, emit `insufficient_evidence`.
6. Only an otherwise admitted candidate is sent to the existing isolated
   ontology runner. A runner failure yields `rejected`; a successful candidate
   yields `accepted` **as a proposal**, not a truth claim.

No branch changes, registry writes, memory writes, or rule installation occur.

## Result invariants

Every result has the fields hypothesis ID, registry identity, source snapshot
hash, supporting assertion IDs, refuting assertion IDs, decision, and (when
run) a disposable candidate result. For malformed input, identity fields may
be `null` rather than fabricated; the source snapshot is still hashed before
validation. Registry identity binds canonical JSON of the inline declaration
object through SHA-256 (recursive object-key sorting, while declaration-array
order remains meaningful). This avoids treating parser-specific whitespace as
ontology identity. Adoption of a shared on-disk registry remains a separate
governance step. Equal input bytes and equal hypothesis must yield byte-stable
JSON after canonical sorting.

## Rejection examples

- an `eligible(alice)` negative assertion rejects a rule deriving that exact
  conclusion from `works_at(alice,acme)`;
- a support replaced by a newer assertion is `conflicted`, not silently used;
- a rule missing evidence or with a base predicate in its head is rejected;
- a malformed candidate never reaches SWI-Prolog.
