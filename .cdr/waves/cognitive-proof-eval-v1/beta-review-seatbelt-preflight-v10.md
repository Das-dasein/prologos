# CDR beta review — issue #72 Seatbelt preflight v10

Independent review of alpha commit
`0bc98c3e0179a143cf7046a2be9b5cccd5f0f6da` against
`gamma-v9-contamination-20260906.md`.

## Verified preparation properties

- v10 is a new offline preflight module only.  The alpha diff adds the v10
  module, schema, focused test and an npm script; no v7, v8 or v9 file is
  changed.
- The focused test ran on macOS with actual `/usr/bin/sandbox-exec`.  It denies
  reading the current checkout's `package.json`, the real
  `~/.codex/memories/MEMORY.md`, and the actual
  `.cdr/waves/cognitive-proof-eval-v1/dataset.json`; it also denies an
  outside-root write.  It permits a sealed-input read and a declared-output
  write.
- `buildCodexInvocation` is construction only: this test uses `/bin/echo`,
  invokes neither Codex nor a provider, and makes no network/auth call.  Its
  intended command has `-C <fresh-root>`, `--skip-git-repo-check`,
  `--ignore-user-config`, `--sandbox read-only`, and an outer default-deny
  Seatbelt profile.
- The committed schema does not persist an auth path.  A future invocation
  requires an exact existing `CODEX_HOME/auth.json`; it is neither copied into
  the sealed root nor emitted by the preflight artifact.

## Reproduction

Passed:

```text
npm run test:trusted-proof-codex-seatbelt:v10
npm test
npm run test:trusted-proof-codex-diagnostic:v9
npm run test:trusted-proof-codex-diagnostic-live:v9
npm run test:trusted-proof-codex-exec-live-candidate
git diff --check 0bc98c3^ 0bc98c3
```

## Blocking findings

`createSeatbeltProfile` accepts arbitrary caller-supplied
`extra_runtime_roots`.  Passing the current repository as such a root makes
`package.json` readable inside the otherwise default-deny sandbox.  That is a
real configuration escape from the required "no repository" invariant; the
current API does not reject it and the focused test does not mutate it.

Also, when the exact `auth.json` allowance is supplied, every process under
the same outer Seatbelt profile can read that file.  A direct `/bin/test -r`
probe succeeded.  This does not contradict the alpha note, but it means v10
must never claim that a Codex tool child cannot read auth.  Its presence is a
credential-surface constraint, not a capability boundary for the answering
agent.

## Required repair before any live execution

1. Reject `extra_runtime_roots` that overlap the repository, the user home,
   protected evaluator/dataset paths, or the sealed run root except for the
   narrowly identified executable runtime dependencies.  Add a mutation test
   that proves a repository root cannot be admitted.
2. Keep the exact-auth-path caveat explicit in the live contract.  Do not
   enable agent shell/tool children under this profile unless authentication is
   mediated outside their readable filesystem capability.
3. Preserve the existing real denied-access probes and add the configuration
   mutation to the focused test.

## Verdict

**REVISE.**  The offline probe is meaningful evidence that a safely composed
profile can deny the identified files, but the publicly exposed runtime-root
parameter can re-open the repository and therefore does not yet establish the
future live execution boundary required by issue #72.  No AST work, live
Codex/provider invocation, effectiveness claim, or v9 rerun occurred in this
review.
