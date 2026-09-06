# CDR beta review R5 — issue #76 metadata/content structural binding

Independent review of alpha commit
`5029d489d72875a55b8c255f68aa5c955e2c4c16` after finding B76-4.

## Structural test

The focused test now identifies the three generated Seatbelt clauses by their
ordered prefixes, then slices them apart:

- `file-read-metadata` must include literal traversal grants for `/etc`,
  `/etc/codex`, `/private/etc`, and `/private/etc/codex`;
- `file-read*` must include exactly the two required policy file aliases,
  `/etc/codex/requirements.toml` and
  `/private/etc/codex/requirements.toml`;
- the content slice rejects recursive grants for `/etc`, `/private`, and
  `/Users`.

This repairs the prior false assurance: an alias present only in the content
clause cannot satisfy the metadata assertion, and a metadata ancestor cannot
satisfy the content assertion. The profile emits one ordered instance of each
of these clauses, so the slices cover the actual generated grants rather than
an unrelated duplicate clause.

## Independent execution

I ran:

```text
node test-trusted-proof-codex-seatbelt-v10.js
npm run test:trusted-proof-codex-seatbelt:v10
npm test
git diff --check
```

All passed. I additionally generated a fresh default-deny profile with the
realpath-resolved installed executable:

```text
/Users/artem/.codex/packages/standalone/releases/0.153.4-aarch64-apple-darwin/bin/codex
```

Inside it, `codex --version` exited 0; sealed-input read and declared-output
write exited 0. Repository, MEMORY, dataset/evaluator reads and an
outside-root write each exited nonzero. The two optional requirements aliases
returned ENOENT (not Seatbelt EPERM); unrelated `/private/etc/hosts` returned
EPERM. No auth file, model/provider request, or network call was made.

## Verdict

**GO_PREPARATION.** B76-4 is repaired. This approves the offline Seatbelt
preflight and its narrow policy-file traversal capability only; it does not
approve a paid live replay or make any effectiveness claim.
