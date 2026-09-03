# Beta report r1: ontology-mvp-v0

## Verdict

**REVISE.** The repaired slice passes the focused regression suite and keeps
candidate execution isolated, but provenance is still broader than the answer
being explained and failure records are not path-independent. It is therefore
not suitable as a pinned CDR F3 dependency.

## Independent verification

Run from `/Users/artem/Documents/code/prolog-agent-memory`:

```text
node test-ontology-harness.js       # ontology-harness ok
npm test                             # ok; memory-store ok; codex-provider ok
swipl --version                     # SWI-Prolog 10.0.2 arm64-darwin
```

Additional checks used the public `run()` API without changing source files:

- a successful `r_other` rule, whose body is true but whose head is not the
  `derived` query answer, was included in `supporting_rules` alongside the
  actual `r_ok` rule;
- non-empty parameters for every registered query were rejected before SWI
  with deterministic `QUERY_PARAMETERS`;
- a base-predicate rule head was rejected with `IMMUTABLE_PREDICATE`;
- missing SWI returned `swipl_error` with empty answers, and a forced 1 ms run
  returned `timeout` with empty answers;
- no `pam-ontology-*` temporary directories remained after these runs;
- `memory.pl` and `data/memory.pl` remained unchanged (SHA-256:
  `2806860f693d47d306672362d2e1b146fbeabfd5ecde035576542e655b0001d0` and
  `82edc5ce2a02337c029ee581832a443ec0e0973cec5de8433c983c1e81ee45a6`);
- repeated successful execution was structurally deterministic for the sample.

## Findings

### High: supporting rule provenance is not answer-scoped

`ontology_support(Id) :- Body` is generated for every rule, and the runner
collects every `ontology_support/1` proof for `derived`, independently of the
returned answer. Thus any unrelated rule with a successful body is reported as
supporting evidence. The repair fixes the old “all rule IDs” case when an
irrelevant body fails, but does not establish that the rule actually derives
the returned answer. Provenance must be joined to the queried derivation (or
the contract must explicitly define body-success provenance and test that
semantics).

### Medium: timeout and SWI errors leak implementation paths

The timeout message contains the full runner and temporary candidate paths;
spawn failure includes the configured executable path. Gamma requires an
`{code,message}` error without stack or path and deterministic output. Error
messages should be normalized to stable, path-free text for timeout, non-zero
exit, max-buffer, and spawn failures.

### Medium: rejected result shape is not total

When the proposal is malformed JSON (`run("{")`) or has an unknown/missing
schema key, `candidate_version` is `undefined` and is omitted by
`JSON.stringify`. The result contract requires `candidate_version` in every
record; malformed proposals should return it as `null` (or another explicitly
contracted value).

### Observation: registry is finite rather than generically extensible

The explicit registry and fixed arities do prevent silent arbitrary Prolog and
are suitable as a fail-closed v0 allowlist. However, it is hard-coded and its
derived vocabulary remains employment/technology-shaped (`worked_on`,
`has_frontend_experience`, etc.); proposals cannot declare a new domain
predicate. This is acceptable only if “domain-neutral” means a versioned,
replaceable registry, not that this pinned registry can induce arbitrary
domain-neutral vocabulary. A future contract/version should make registry
declaration or a genuinely generic vocabulary explicit.

## Passed boundaries

- immutable core/base-head protection passed for the tested collision;
- parameterized queries fail closed before SWI;
- candidate source is bounded and restricted to registered terms/rules;
- candidate runs in a fresh temporary directory, and durable memory was not
  mutated on success or failure;
- malformed, unknown, unsafe, over-sized, unbound, duplicate-ID, and cyclic
  proposals remain covered by the focused tests.

## Gate decision

Do not pin these artifacts for CDR F3 yet. Repair answer-scoped provenance,
path-free total error normalization, and rejected-result shape; add focused
regressions for a successful-but-unrelated rule, malformed proposal result
shape, and timeout/error message paths. Then repeat an independent beta audit
and record an immutable commit/archive identifier and source hashes. This is
still synthetic engineering evidence, not CDR utility or product evidence.

## Audited artifact hashes

```text
ontology-harness.js       71d2450b80143da8b0d216d53ea1474b64823db34e6d974c6c9a8f702c3f8f4a
ontology-runner.pl        0c1e091c8da6277025b103106dca2122b3fe7a2c09acea04262fce774c57f288
test-ontology-harness.js  88370d26dfe85a7b0a38241f6de5188b17eb609ea1028c85d5243b40185f12fe
```
