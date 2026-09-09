# Gamma R6: switch the trusted-proof collector to receipt v5

CDR PR #45 supplies forward-only receipt v5. It pins actual wire authority
only, so changing the collector's emitted receipt version no longer invalidates
the transport registry. The collector currently emits v3 and must consume v5.

## Required alpha work

- Change only `trusted-proof-live-candidate` and its tests/config/docs from
  v3 registry/validator/schema/status to v5 equivalents.
- Preserve exact `{temperature, top_p}` sampling, sealed byte-for-byte prompt,
  provider gates, per-attempt local evidence, 12×P0/P1 deterministic order,
  equal-E and accepted-decision no-partial-receipt gates.
- Prove with fake transport that the resulting 24 records validate through v5,
  receipt filename/version is v5 only, and all existing failure gates leave no
  receipt. Default CLI makes zero calls.
- Do not modify `.cdr/**` or the two pinned wire authority files; no live
  provider/key/network/raw output/result claim.

Fresh beta reproduces the v5 fake collection and mutations. GO permits closing
#34 implementation readiness; human execution and later CDR evidence audit
remain distinct.
