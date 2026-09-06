# Gamma R7: switch trusted-proof collector to receipt v6

CDR PR #47 makes receipt v6 the current forward-only candidate format. It
adds independent native provider usage integrity and retains v5 wire authority
without pinning collector source. The collector remains v5-labelled and must
consume v6 before an operator run is permitted.

## Required alpha work

- Change only collector/config/test/docs consumer references from v5 to v6:
  registry/validator import, receipt schema/version/file name and local status.
- Preserve exact `{ temperature, top_p }`, native provider response, sealed
  prompts, 12×P0/P1 order, every accepted decision and equal-E/no-partial
  receipt gate.
- Fake 24-record bundle must validate through v6 and demonstrate actual native
  usage counters/reconciliation and E=input. Add collector-level mutation
  coverage ensuring bad nested usage never yields a receipt; default CLI zero
  calls and all earlier negatives stay true.
- Do not alter `.cdr/**` or the two pinned wire authority sources, call a
  provider, use credentials, produce raw live data, aggregate or claim effects.

Fresh beta reruns v6 receipt intake plus fake collection/negative paths. GO
closes issue #34 implementation readiness. The only remaining action is the
user's explicit live command and a future CDR beta on its local artifacts.
