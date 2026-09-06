# CDR beta review R4 — issue #76 requirements metadata traversal

Independent review of alpha repair
`66fd6d16f2d17615e813bca59c129c3a39b17016`.

## Capability inspection

The source-level repair is narrow: it adds only the ancestors of the two
literal requirements aliases to the `file-read-metadata` clause:

```text
/etc/codex/requirements.toml
/private/etc/codex/requirements.toml
```

The `file-read*` clause still names those two files as literals; it does not
add a `subpath` content grant for `/etc`, `/private`, a home directory, or the
checkout. `file-read-metadata` can reveal path-existence/metadata while
traversing these ancestors; it is not a claim of zero path-name disclosure.
The intended boundary remains: no contents of an arbitrary file below either
directory become readable.

## Independent execution

The focused Seatbelt probe passed and a generated default-deny profile ran the
resolved installed executable successfully:

```text
/Users/artem/.codex/packages/standalone/releases/0.153.4-aarch64-apple-darwin/bin/codex --version
codex-cli 0.153.4
```

No auth file, model, provider request, or network call was used. The focused
probe also denied repository, MEMORY, dataset/evaluator, and outside-write
access while permitting sealed input and declared output. `npm test` and
`git diff --check 66fd6d1^ 66fd6d1` passed.

## Finding B76-4

**REVISE.** The new unit assertion is not exact enough to bind the claimed
metadata repair. It checks only that the complete profile string contains
`(literal "/etc/codex")`; that token can occur in neither a distinguished
metadata clause nor prove the `/private/etc/codex` ancestor was added. The
existing requirements-file assertions also match content literals, so they do
not distinguish metadata traversal from content read.

Add a focused, structural profile assertion that:

1. isolates the `file-read-metadata` rule and verifies both required ancestor
   aliases (including `/etc/codex` and `/private/etc/codex`);
2. isolates `file-read*` and verifies the only requirements-related content
   scopes are the two exact `requirements.toml` literals; and
3. rejects requirements-related `subpath` scopes for `/etc`, `/private`, the
   home directory, and repository roots.

This is an offline test-only repair. It must retain the successful real-Codex
`--version` probe and protected-file denial tests. No live replay is approved
until B76-4 is repaired and independently re-reviewed.
