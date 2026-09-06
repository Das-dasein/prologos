# Alpha implementation — v10 Seatbelt preflight

This implementation is an offline macOS preflight only. It creates a fresh
sealed root with distinct `input` and `output` children, and builds (but never
executes) a Codex invocation with `-C <fresh-root>`,
`--skip-git-repo-check`, `--ignore-user-config`, and Codex's `read-only`
sandbox. An outer default-deny `sandbox-exec` profile limits reads to declared
runtime roots plus sealed input, and writes to declared output only. Runtime
roots are not caller-configurable: the declared Codex executable parent is
checked after realpath resolution and rejected if it overlaps the repository,
CDR evidence/dataset root, or user-memory root.

The test executes actual Seatbelt probes: host repository-file, `MEMORY.md`,
dataset/evaluator-file reads and an outside-root write all fail; sealed-input
read and output write succeed. It makes no provider, network, Docker, AST, or
effect claim. Authentication is intentionally absent from committed config:
Codex documents that `--ignore-user-config` still uses `CODEX_HOME` for auth,
so a future runtime must provide exactly `CODEX_HOME/auth.json`; it is never
copied, emitted, or recorded in artifacts. This is an accepted credential-
surface limitation, not a scientific-quality boundary: an outer process
sandbox cannot distinguish the Codex parent from inherited child processes,
so this preflight makes no claim that tool children cannot read that exact
allowed file. It does not broaden the grant beyond that one file.
