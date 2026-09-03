# Dataset manifest: source-snapshot-8a01b66

- Dataset ID: `source-snapshot-8a01b66`
- Origin: local `prolog-agent-memory` workspace
- Captured source commit: `8a01b668eac3377e62a29ca9c917ca16a4faced3`
- Content: 19 implementation, schema, package, adapter, harness, and smoke-test files
- Integrity: `.cdr/datasets/source-snapshot-8a01b66.sha256`
- Intended use: reproduce the bounded CDR symbolic-oracle protocol
- Redistribution: not authorized by this manifest
- Personal data: none intentionally included

This snapshot records the #9 core/domain boundary. The source commit is the
primary identity. The SHA-256 file is a second, file-level integrity check for
environments that consume an archive instead of a Git checkout.

Excluded deliberately:

- `data/memory.pl`, because it is exploratory state that may contain personal
  facts;
- `node_modules/`, because dependencies are identified by `package-lock.json`;
- `.cdr/`, because it contains evaluation metadata and outputs rather than
  trusted runtime source.

Integrity command, run from the project root at the pinned commit:

```sh
shasum -a 256 -c .cdr/datasets/source-snapshot-8a01b66.sha256
```

