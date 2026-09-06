# Gamma repair R1 — issue #52: preserve legacy manifest parser contract

## Beta finding

β R1 (`139b03f`) issued `REVISE`.  The v7 authority wording is accurate, but
the inherited v2 validator and registry builder parse the exact marker:

```text
Source implementation snapshot: `<40-hex>`
```

Alpha changed that heading to a prose label.  It therefore made the historical
v2 source commit unavailable and caused the v7 self-test's inherited
compatibility check to fail closed before any provider operation.

## Alpha repair

Edit only `manifest.md`.  Restore the exact legacy marker line, with its
existing historical commit value, immediately followed by wording that it is
offline-fixture provenance and not current live-transport authority.  Retain
the v7 authority/status text from α.  Do not edit `status.md` unless needed to
avoid contradicting that preserved line.

## Verification

Run `git diff --check`, `npm run test:trusted-proof-live-candidate`, and
`npm run test:cdr-receipt-intake:v7`.  The repaired tests must pass entirely
offline; a green result is structural evidence only, never a provider result
or CDR/effectiveness receipt.

## Boundaries

No JavaScript, registry, config, dataset, source hash, transport, provider,
model, raw-artifact, scorer, threshold, or live-run change.  A fresh β must
review the repair independently.
