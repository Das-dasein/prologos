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

The profile permits outbound provider networking, the one exact optional Codex
policy lookups `/etc/codex/requirements.toml` and its exact macOS alias
`/private/etc/codex/requirements.toml`, and only the fixed macOS
TLS runtime files `/private/etc/ssl/openssl.cnf` and
`/private/etc/ssl/cert.pem` when they exist; it never grants an `/etc`,
`/private`, home, or repository tree. The policy lookup is allowed even when
absent so Codex observes `ENOENT`, not a Seatbelt denial. The two spellings
are necessary because Codex `exec` uses `/etc` while Seatbelt may preserve the
literal open path rather than resolving the symlink first. Their ancestor
directories receive metadata traversal only; content reads remain the two
literal files. Before any live
child, the offline preflight verifies that the resolved
Codex executable can start with `--version` and that those declared TLS files
are readable. The test also executes actual Seatbelt probes: host
repository-file, `MEMORY.md`, dataset/evaluator-file reads and an outside-root
write all fail; sealed-input read and output write succeed. It makes no
provider, auth, model, Docker, AST, or effect claim. Authentication is
intentionally absent from committed config:
Codex documents that `--ignore-user-config` still uses `CODEX_HOME` for auth,
so a future runtime must provide exactly `CODEX_HOME/auth.json`; it is never
copied, emitted, or recorded in artifacts. This is an accepted credential-
surface limitation, not a scientific-quality boundary: an outer process
sandbox cannot distinguish the Codex parent from inherited child processes,
so this preflight makes no claim that tool children cannot read that exact
allowed file. It does not broaden the grant beyond that one file.
