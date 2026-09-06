# Gamma repair R1 — issue #54 provider/config binding

## Beta R1 finding

β R1 (`b8a479a`) reproduced that selecting `codex-exec` while the supplied
immutable config explicitly contains `provider: "openai-api"` succeeds.  The
CLI selection and config can therefore describe different transports.

## Required alpha repair

Before any fresh raw directory, provider construction, or spawn/client work,
the answering bridge must enforce: if `config` owns a `provider` field, its
value must equal the selected provider.  Preserve compatibility for the
historical OpenAI v7 config which lacks that field.  Add symmetric fake-only
tests for both selections and assert no raw directory or provider construction
on mismatch.

## Boundaries

Do not alter command shape, output schema, Codex usage parsing, OpenAI wire,
CDR v7 collector/intake/registry, dataset, or run a real Codex session.  A
fresh β reviews this repair independently.
