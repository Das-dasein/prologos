# Alpha implementation — v10 Seatbelt preflight

This implementation is an offline macOS preflight only. It creates a fresh
sealed root with distinct `input` and `output` children, and builds (but never
executes) a Codex invocation with `-C <fresh-root>`,
`--skip-git-repo-check`, `--ignore-user-config`, and Codex's `read-only`
sandbox. An outer default-deny `sandbox-exec` profile limits reads to declared
runtime roots plus sealed input, and writes to declared output only.

The test executes actual Seatbelt probes: host repository-file, `MEMORY.md`,
dataset/evaluator-file reads and an outside-root write all fail; sealed-input
read and output write succeed. It makes no provider, network, Docker, AST, or
effect claim. Authentication is intentionally absent from committed config:
Codex documents that `--ignore-user-config` still uses `CODEX_HOME` for auth,
so a future runtime must provide exactly `CODEX_HOME/auth.json`; it is never
copied, emitted, or recorded in artifacts. This is the narrowest practical
allowance, but it is a real remaining credential-surface constraint: an outer
process sandbox cannot distinguish the Codex parent from its inherited child
processes. A β review must reject a live design that lets tool children read
that path; a future production transport should prefer OS credential mediation
if Codex supports it.
