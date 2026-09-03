# Dataset manifest: source-snapshot-f8796ab

- Dataset ID: `source-snapshot-f8796ab`
- Origin: local `prolog-agent-memory` workspace
- Captured source commit: `f8796abc1c7c9a0ff2c9a61b32841e0b83bdd250`
- Content: 18 implementation, schema, package, adapter, harness, and smoke-test files
- Integrity: `.cdr/datasets/source-snapshot-f8796ab.sha256`
- Intended use: reproduce the bounded CDR symbolic-oracle protocol
- Redistribution: not authorized by this manifest
- Personal data: none intentionally included

This snapshot supersedes `source-snapshot-2026-09-03` as the current source
identity for future CDR review. The prior snapshot remains an immutable record
of the initial observation and is not rewritten to match later code.

The source commit is the primary identity. The SHA-256 file is a second,
file-level integrity check for environments that consume an archive instead of
a Git checkout.

Excluded deliberately:

- `data/memory.pl`, because it is exploratory state that may contain personal
  facts;
- `node_modules/`, because dependencies are identified by `package-lock.json`;
- `.cdr/`, because it contains evaluation metadata and outputs rather than
  trusted runtime source.

Integrity command, run from the project root at the pinned commit:

```sh
shasum -a 256 -c .cdr/datasets/source-snapshot-f8796ab.sha256
```
