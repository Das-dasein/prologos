# CDR beta review R3 — issue #76 exact requirements aliases

Independent review of alpha repair
`4f1d28b3acccaf991ffa5ef5a36bd56cab54e239`.

## Exact capability boundary

The change replaces the one optional Codex requirements lookup with exactly
these two literal content-read paths:

```text
/etc/codex/requirements.toml
/private/etc/codex/requirements.toml
```

There is no `file-read*` `subpath` or `literal` grant for `/etc`,
`/private/etc`, or `/private`. The profile's possible ancestor entries are
only `file-read-metadata` traversal grants. A generated profile contained the
two literal requirements paths and no broad content-read grant.

## Independent runtime evidence

Using the real resolved installed Codex binary, the generated profile ran
`codex --version` successfully:

```text
codex-cli 0.153.4
```

This used no auth file, provider request, model invocation, or network call.
Under that same profile, both `/etc/hosts` and `/private/etc/hosts` were
denied with `Operation not permitted` (status 1). The existing focused probe
also still denied checkout, memory, dataset/evaluator and outside-write
access, while permitting only sealed input and declared output.

## Checks

```text
npm run test:trusted-proof-codex-seatbelt:v10
npm run test:trusted-proof-codex-clean-replay:v10
npm run test:trusted-proof-codex-exec-live-candidate
npm test
git diff --check 4f1d28b^ 4f1d28b
```

All passed. The repair does not change v8 collection or v10 P0/P1
proof-consumption semantics; it is offline transport preparation only.

## Verdict

**GO_PREPARATION.** The two literal spelling aliases repair the Codex startup
lookup without widening protected host-data reads.
