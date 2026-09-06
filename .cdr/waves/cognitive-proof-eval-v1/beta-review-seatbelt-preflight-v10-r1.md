# CDR beta repair review R1 — issue #72 Seatbelt preflight v10

Independent review of alpha repair commit
`85738b32806bd2acb6e094b7db761d005f2a4127`, against the prior beta finding
`B72-1` in `beta-review-seatbelt-preflight-v10.md`.

## Closed runtime-root escape

- `extra_runtime_roots` is removed from the committed v10 JSON schema, from
  the profile and invocation function parameter lists, and from the runtime
  root calculation. It is not a configurable grant anymore. A legacy unknown
  property passed from JavaScript is ignored because it is not destructured;
  it cannot add a readable root.
- Runtime reads are closed to the fixed system roots plus the resolved parent
  of the declared Codex executable. `realpath` is applied to existing file and
  directory inputs before the check/profile construction.
- That executable parent is rejected when it overlaps the checkout,
  `.cdr/waves/cognitive-proof-eval-v1`, or `~/.codex/memories`; broad roots
  are also rejected. Thus a Codex executable path inside the repository cannot
  turn the repository into a runtime grant.

## Independent reproduction

The actual macOS `/usr/bin/sandbox-exec` focused probe passed, including real
denial of checkout `package.json`, real `MEMORY.md`, the actual evaluator or
dataset path, and an outside-root write, while allowing sealed input and the
declared output.

I additionally constructed a profile with the removed legacy JavaScript field
`extraRuntimeRoots: [process.cwd()]` and attempted `/bin/cat package.json` in
the sandbox. It was denied (`status: 1`). I separately pointed `codexPath` at
the checkout `package.json`; profile construction rejected it with the
protected repository/evidence-root error. These are direct mutations of the
old escape, not an inference from schema validation.

Passed:

```text
npm run test:trusted-proof-codex-seatbelt:v10
npm run test:trusted-proof-codex-diagnostic:v9
npm run test:trusted-proof-codex-diagnostic-live:v9
npm run test:trusted-proof-codex-exec-live-candidate
npm test
git diff --check
git diff --check 85738b3^ 85738b3
```

## Credential-surface boundary

The alpha note now accurately records that exact `CODEX_HOME/auth.json` is an
accepted credential-surface limitation. The outer process sandbox cannot
distinguish Codex from inherited child processes, so this review does not claim
that a tool child is unable to read the allowed auth file. The file is still
not committed, copied to the sealed run root, printed, or treated as a
scientific-quality input. This review approves only the offline preflight;
there was no live provider, network, auth, Docker, AST, or effectiveness run.

## Verdict

**GO_PREPARATION.** `B72-1` is repaired: an operator cannot reopen the
repository/evidence read grant through a declared extra runtime root, and the
declared executable cannot reside in a protected root. Any future live
transport must preserve this closed-root construction and must not represent
the credential exception as a sandboxed tool-capability denial.
