# CDR beta review R1 — issue #76 Seatbelt network/TLS repair

Independent review of alpha repair
`040ac495ce1ff6cc42c813598e30f3f0b7e30b3c`, against B76-1 in
`9f8ead78b9c902a30510001e92acb5156fe289fe`.

## Boundary reviewed

The repair adds exactly one Seatbelt network capability:

```scheme
(allow network-outbound)
```

It adds content-read literals only for these fixed, existing macOS TLS runtime
files:

```text
/private/etc/ssl/openssl.cnf
/private/etc/ssl/cert.pem
```

The generated profile does not contain a recursive `subpath` grant for
`/private`, `/private/etc`, `/Users`, the user home, `.codex`, the checkout,
the CDR evidence root, or the dataset/evaluator root. Parent-directory grants
are `file-read-metadata` traversal grants only; attempted content reads of
protected files remain denied.

## Independent execution evidence

I ran `offlineProbeReport` with the actual realpath-resolved local Codex
binary, not the `/bin/echo` unit-test stand-in:

```text
/Users/artem/.codex/packages/standalone/releases/0.153.4-aarch64-apple-darwin/bin/codex --version
```

Under the generated `deny default` profile it returned `codex-cli 0.153.4`
with status 0. Both declared TLS file read probes returned status 0. The same
actual profile denied reads of the repository `package.json`, user
`MEMORY.md`, and evaluator dataset with `Operation not permitted`; it also
denied an outside-run-root write. Sealed-input read and declared-output write
succeeded. This preflight does not pass an auth file or prompt to Codex, and
makes no model or provider call.

Additional literal-profile assertions verified that no forbidden broad
`subpath` grant is emitted and each present TLS file appears only as an exact
literal grant.

## Scope preservation

- P0/P1 proof-consumption semantics are unchanged: host code computes the
  trusted proof before the child and places only the sealed P1 result in the
  prompt.
- No dynamic Prolog execution, AST admission, rule authoring, evaluator
  contract, repository mount, or effect conclusion is introduced.
- This is runnable transport preparation, not a live model run or a claim
  that proof improves answers.

## Checks

```text
npm run test:trusted-proof-codex-clean-replay:v10
npm run test:trusted-proof-codex-seatbelt:v10
npm run test:codex-diagnostic:v9
npm run test:trusted-proof-codex-exec-live-candidate
npm test
git diff --check
```

All passed. No working-tree changes existed before this review record.

## Verdict

**GO_PREPARATION.** B76-1 is repaired with a minimal outbound-network rule
and fixed TLS-file exceptions while the protected host-evidence boundary
remains enforced. A later live replay still requires the separately approved
explicit invocation and a post-run raw-artifact audit.
