# Beta R6 report: domain-neutral CDD registry

## Verdict

**PASS.** Commit `b7e42b6` implements the intended registry boundary and is
adequate for bounded idea validation at the CDD engineering level. The core
does not prescribe an employment ontology: domain vocabulary is accepted only
through an explicit versioned registry, while runtime predicates remain
reserved independently of that registry.

This is not evidence of ontology quality, CDR F3 validity, or product utility.

## Scope and source

- Audited exactly commit `b7e42b6` (`b7e42b6` was `HEAD`).
- Read `manifest.md`, `status.md`, `gamma-spec.md`, and
  `alpha-repair-report-r6.md`.
- Audited `ontology-harness.js`, `ontology-runner.pl`,
  `test-ontology-harness.js`, and the separate `memory-store.js` path.
- No implementation, test, CDR, dataset, oracle, or threshold file was
  modified. This report is the requested beta artifact.

## Commands and results

```text
node test-ontology-harness.js  # ontology-harness ok
npm test                       # ok; memory-store ok; codex-provider ok
git diff --check               # clean
swipl --version                # SWI-Prolog 10.0.2 arm64-darwin
```

## Registry and domain checks

- `PREDICATE_REGISTRY` exports no bundled predicates (`Object.keys(...)` is
  empty), so the default CDD core has no domain vocabulary.
- A proposal containing `works_at/2` without a registry is rejected with
  `PREDICATE_ARITY`; the same rejection applies to other former employment or
  technology names unless explicitly declared.
- The focused harness executes an arbitrary custom domain:
  `connected_to/2` derives `socially_connected/1` when a
  `predicate-registry-v1` is supplied, and rejects the same proposal when it is
  omitted. A proposal carrying that registry also executes successfully.
- Registry declarations and terms cannot introduce reserved runtime, system,
  loading, or mutation predicates. The focused checks cover proposal-declared
  and manually injected unsafe registries, including `consult`,
  `ontology_derived`, `assert`, and `retract`.
- Employment/education/technology names occur as explicit test fixtures and in
  the independent legacy claim-ingestion allowlist in `memory-store.js`; they
  are not part of the CDD registry. The legacy allowlist is therefore a
  separate path, not a hidden CDD domain contract.

## Preserved safety and provenance boundaries

The focused suite remains green for fail-closed schema/predicate checks,
reserved-predicate isolation, answer-scoped supporting-rule provenance,
malformed/recoverable candidate-version handling, custom-registry isolation,
semantic typed-record provenance/source validation, and path-free missing-SWI
error normalization. Candidate execution still uses a fresh temporary file and
does not append to durable memory.

The checked-in focused test still does not independently exercise fake-worker
timeout and non-zero-exit paths, nor does it assert durable-file hashes in this
R6 run. These are coverage limitations inherited from the harness, not
observed failures of the tested boundary; they should be added before treating
the harness as a stronger operational gate.

## Decision

**CDD core adequate for idea validation: yes, with the stated engineering
limits.** It is suitable for testing whether a model can propose and execute a
small domain-neutral ontology under an explicit vocabulary and bounded rules.
Keep CDR F3 and any ontology-quality claim separate until their independent
method, data, and thresholds are audited.
