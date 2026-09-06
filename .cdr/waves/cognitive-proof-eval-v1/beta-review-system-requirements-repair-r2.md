# CDR beta review R2 — issue #76 optional requirements lookup

Independent review of alpha repair
`a9151a5a2fa2024300cdbb84aa1af71d2a93add1`.

## Exact boundary

The executable change adds one content-read capability, exactly:

```scheme
(literal "/private/etc/codex/requirements.toml")
```

It is an absent optional Codex policy file on this host. Under the generated
profile, reading it returns `No such file or directory` (ENOENT), while an
unrelated `/private/etc/hosts` read returns `Operation not permitted` (EPERM).
The profile emits no recursive `subpath` content-read grant for `/private`,
`/private/etc`, `/etc`, `/Users`, the home directory, the checkout, the CDR
evidence root, or the dataset/evaluator root. Its pre-existing ancestor
entries are `file-read-metadata` traversal rules, not content-read rules.

## Independent runtime evidence

I generated a fresh profile with the realpath-resolved installed binary:

```text
/Users/artem/.codex/packages/standalone/releases/0.153.4-aarch64-apple-darwin/bin/codex
```

`sandbox-exec -p <generated-profile> <codex> --version` returned status 0 and
`codex-cli 0.153.4`. No auth file, prompt, provider request, or model call
was supplied. The same actual profile denied content reads of repository
`package.json`, `MEMORY.md`, the CDR dataset, `/private/etc/hosts`, and a
home-file probe; it also denied a write outside the fresh sealed run root.
It allowed only sealed-input reading and declared-output writing.

## Checks

```text
node test-trusted-proof-codex-seatbelt-v10.js
npm run test:trusted-proof-codex-clean-replay:v10
npm run test:trusted-proof-codex-seatbelt:v10
npm run test:trusted-proof-codex-exec-live-candidate
npm test
git diff --check d347683..a9151a5
```

All passed. v7-v9 and v10 P0/P1 proof-consumption semantics are untouched.
This remains offline transport preparation, not a live replay or an effect
claim.

## Verdict

**GO_PREPARATION.** The optional lookup repair is literal and minimal; it
changes the desired Codex startup failure from Seatbelt EPERM to normal ENOENT
without widening protected host-data access.
