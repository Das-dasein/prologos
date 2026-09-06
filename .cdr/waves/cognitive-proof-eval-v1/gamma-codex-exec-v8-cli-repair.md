# Gamma CDR repair — issue #58: guarded Codex v8 CLI entrypoint

## Observed operator failure

The v8 collector is importable and fake-tested but has no `require.main`
entrypoint.  Direct execution silently succeeds without a collection.  This
means the declared human-operated command does not exist.

## Alpha target

Add only a CLI wrapper to `trusted-proof-codex-exec-live-candidate.js`:

- no arguments prints a stable offline/no-default-provider status and makes no
  filesystem, credential or Codex action;
- live operation requires exactly `--provider codex-exec`,
  `--allow-live-provider`, `--config ABSOLUTE_FILE`, `--model MODEL`, and
  `--root FRESH_ABSOLUTE_DIR`;
- it reads only that supplied config, calls the existing collector, and prints
  success only after its validated candidate receipt exists;
- malformed/missing/mismatched gates/config/root fail before spawn;
- fake-only subprocess tests cover offline, all CLI gate failures and one
  injected fake collector success.  The test must not invoke real Codex.

## Boundary

Do not change v8 authority/schema/validator/collector semantics, v7/OpenAI,
model, credential, raw artifact or result policy. Fresh CDR β reviews only
this runnable-operator repair.
