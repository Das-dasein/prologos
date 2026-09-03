# Alpha repair report r3: ontology-mvp-v0

## Delivered

- Added one reserved predicate denylist covering immutable core predicates,
  trusted runner adapters/dispatch, and Prolog runtime, loading, assertion,
  meta-call, I/O, process, and control predicates.
- Applied the denylist independently to registry construction, injected
  registry validation, and every proposal term. Custom domain predicates remain
  declaration-based and executable.
- Added focused regressions for custom declarations/proposals using
  `consult/1`, `ontology_derived/1`, `assert/1`, and `retract/1`, including a
  manually injected registry object, while retaining the custom domain
  `connected_to/2` -> `socially_connected/1` success case.

## Verification

```text
node test-ontology-harness.js  # ontology-harness ok
npm test                        # ok; memory-store ok; codex-provider ok
git diff --check                # clean
```

The repair was made on the requested base `2a5fa25` and preserves the prior
R2 fixes. CDR files, durable memory, and CDR evidence were not modified. No
commit was created.

## Boundary

The registry remains extensible for domain vocabulary declared as `base` or
`derived`, but names reserved by the trusted runtime cannot be admitted even
when supplied through a caller-controlled registry. This is synthetic
engineering evidence only and does not establish CDR or product utility.
