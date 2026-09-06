# CDR beta review: issue #58 Codex v8 CLI entrypoint

Reviewed alpha commit `d2c5de89717d680adc84ca7565d37ce3cad6785d`
against `gamma-codex-exec-v8-cli-repair.md` in a fresh beta session.

## Verdict

**GO_PREPARATION.**  This is a guarded, runnable operator entrypoint for
candidate collection only.  It does not authorize a live provider run,
aggregation, or an effectiveness/result claim.  Any real receipt still needs
a fresh CDR review.

## Independent findings

- Executing the actual module with no arguments exits 0 and emits exactly
  `{"status":"offline-no-default-provider","provider_calls":0}`.  The branch
  returns before config/root access or collector invocation.
- The parser permits only the five declared gates, rejects duplicate and
  unknown options and missing option values, and has no implicit provider or
  model.  `runCli` requires the explicit live flag and `codex-exec`, then
  checks an absolute regular config file, its provider/model binding, and a
  fresh absolute root before calling its collector.
- A separate beta negative sweep used an injected collector that increments a
  counter.  Duplicate/unknown parser inputs, model mismatch, relative root,
  and an extra unknown CLI option all rejected with zero collector calls and
  no root creation.  No Codex process was started.
- The included subprocess test executes the real no-argument entrypoint,
  uses only an injected fake collector for gated failures/success, and asserts
  that a purported success without a receipt file has empty stdout and fails.
  Its injected successful result prints the non-result status only after the
  receipt file exists.  The production collector remains the existing v8 path,
  which validates the envelope before writing and returning the receipt.
- The exact alpha diff changes only this v8 collector's CLI wrapper and its
  fake-only test.  v8 authority/schema/validator/collection behaviour and the
  v7/OpenAI paths were not changed.

## Verification

- `node test-trusted-proof-codex-exec-live-candidate.js`
- `npm run test:trusted-proof-codex-exec-live-candidate`
- `node .cdr/waves/cognitive-proof-eval-v1/validate-codex-exec-receipt-intake-v8.js --self-test`
- independent parser and pre-spawn gate sweep (injected counter collector)
- `npm test`
- `git diff --check c50370c..d2c5de8`

All passed.  No `codex exec`/live provider invocation was made, and no
credentials were inspected.
