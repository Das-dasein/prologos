# Gamma scaffold — issue #52: CDR v7 authority/status alignment

## Observed discrepancy

`trusted-proof-live-candidate.js` imports the v7 receipt validator and the
operator config is `trusted-proof-live-candidate-config-v7.json`, while the
human-facing cognitive-proof wave `status.md` stops after the v3/#38 handoff.
The manifest describes v3 as the future adapter target without identifying the
currently authoritative v7 transport/receipt intake pair.  This is a
documentation-state defect: a later independent CDR beta could otherwise read
obsolete authority as current.

## Alpha target

Update only:

- `.cdr/waves/cognitive-proof-eval-v1/status.md`
- `.cdr/waves/cognitive-proof-eval-v1/manifest.md`

The documents must name the v7 registry/receipt intake and current operator
collector/config; distinguish historical v1--v6 artifacts from current v7
authority; and retain the explicit boundary that this remains preparation,
with no provider call, candidate receipt, CDR receipt, or effectiveness claim.

## Hard boundaries

Do not change JavaScript, package scripts, dataset, slot/proof/prompt
registries, config values, hashes, evaluator/scorer logic, transport, provider
selection, model selection, raw artifacts, thresholds, or any CDR outcome.
Do not perform a live invocation.  The old source snapshot is historical
offline-fixture provenance, not evidence of the current live transport.

## Required evidence

Alpha records the exact documentation changes and runs `git diff --check` plus
the no-live collector test and v7 intake self-test.  A fresh beta independently
checks that the documentation makes no result/effectiveness claim and does not
misstate the v7 authority.
