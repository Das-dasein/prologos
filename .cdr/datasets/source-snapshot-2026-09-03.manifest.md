# Dataset manifest: source-snapshot-2026-09-03

- Dataset ID: `source-snapshot-2026-09-03`
- Origin: local `/Users/artem/Documents/code/prolog-agent-memory` workspace
- Captured: 2026-09-03, Europe/Samara
- Content: 15 implementation, schema, package, and smoke-test files
- Integrity: `.cdr/datasets/source-snapshot-2026-09-03.sha256`
- Intended use: design and reproduce the CDR evaluation protocol
- Redistribution: not authorized by this manifest
- Personal data: none intentionally included

At snapshot-capture time the workspace was a Git work tree with no commit
(`git rev-parse --is-inside-work-tree` was `true`; `git log -1` had no
commits). The snapshot therefore has no commit identity: SHA-256 pins are the
source identity for this initial observation. Any later software change or
producing experiment must run from a real Git commit or an equivalently
immutable archived source bundle.

Excluded deliberately:

- `data/memory.pl`, because it is exploratory state that may contain personal
  facts;
- `node_modules/`, because dependencies are identified by `package-lock.json`;
- `.cdr/`, because the research binding is metadata about the captured source,
  not source input to itself.

Integrity command, run from the project root:

```sh
shasum -a 256 -c .cdr/datasets/source-snapshot-2026-09-03.sha256
```
