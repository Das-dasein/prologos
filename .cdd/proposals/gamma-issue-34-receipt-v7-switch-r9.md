# Gamma R9: final collector switch to receipt v7

CDR PR #50 provides the current v7 candidate format with repaired native usage
shape source binding. The collector emits v6 and therefore correctly fails
closed under v7. This consumer-only change makes the fully fake-tested operator
surface usable for the later explicit human run.

## Required alpha work

- Change collector/config/test/docs only from v6 to v7 validator, registry,
  schema/version and filename.
- Preserve no-default provider, exact sampling/wire/native usage, all 24
  P0/P1 pair and accepted-decision/equal-E/no-partial receipt gates.
- Fake 24-record bundle validates v7; native usage detail-shaped response is
  accepted; arbitrary detail mutations/no decision/E/proof/model/root failures
  emit no receipt. No `.cdr` or pinned transport edits or provider call.

Fresh beta must reproduce v7 fake collection and all relevant no-receipt gates.
GO closes #34 implementation only. A user-run live collection and fresh CDR
beta are still the only route to evidence.
