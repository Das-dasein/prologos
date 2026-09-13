# Source-group assurance v2

## Problem

`fact_source_group_ids` can support a deterministic diversity threshold only
when the group labels come from a trusted boundary. An item-level label or two
fresh event IDs are insufficient: one model could otherwise split one origin
into several apparent sources.

## Trust boundary

Every new `WorldAgent` source event records one assurance class:

- `host_attested`: a trusted host caller supplied both `sourceGroup` and a
  `source-group-attestation-v1` receipt containing `by` and `reason`;
- `host_declared`: a host caller supplied a group string without an attestation
  receipt; the label is visible but ineligible for strict decisions;
- `event_local`: no group was supplied, so the event is useful for traceability
  but cannot establish cross-source diversity;
- `legacy_unspecified`: an older journal record has no assurance field. It is
  not upgraded retrospectively.

All items derived from an event inherit its exact group and assurance. Proposal
input may repeat those values for transport compatibility, but cannot change
them. The append-only hash chain then binds the inherited fields through
proposal, admission, snapshot and reflection records.

The checker still executes only the signed-Horn program. After execution, the
host enriches each support set with the assurance classes belonging to its fact
source groups. This keeps the frozen checker request and old experiment fixture
identities unchanged.

## Decision policies

`independent-fact-support-v1` reproduces the frozen provenance experiment. It
checks structural disjointness of declared fact-source groups and remains
available for replay.

`independent-host-attested-fact-support-v2` first removes every proof path whose
fact groups are not exclusively `host_attested`, then searches for the
lexicographically first set of pairwise disjoint paths. Hermes enables v2 from
the host-owned `decision_min_independent_fact_support_paths` configuration. The
tool schema does not expose an action-policy field, and the provider overwrites
any injected field before calling the bridge.

## Adversarial cases covered

| Attempt | Result |
|---|---|
| One item changes its source group | Proposal rejected |
| One item upgrades its assurance | Proposal rejected |
| Two admitted model proposals create two event IDs | Both paths remain `event_local`; v2 pauses |
| Model supplies a weaker action policy | Hermes provider overwrites it with configured v2 |
| One attested and one local path | Only one eligible path; v2 pauses |
| Two old paths without assurance | Both are `legacy_unspecified`; v2 pauses |
| Two different rule groups share one fact group | Fact-group threshold remains unsatisfied |
| Two distinct host-attested fact groups | v2 may act when the signed-Horn query is also safely entailed |

## Claim boundary

The implementation proves that the recorded labels satisfy this host policy.
It does not authenticate a human, detect collusion, discover that two upstream
documents copied the same source, or establish truth. A production connector
must assign a stable source group from authenticated upstream identity and
retain the corresponding external receipt. Until such a connector exists,
`host_attested` means only that the trusted local host deliberately supplied the
group.

The follow-up [source-lineage policy v3](source-lineage-policy-v3.md) represents
known common origins explicitly and makes Hermes enforce lineage disjointness.
Undocumented copying remains outside the evidence available to the core.

## Verification

```sh
node --test world/provenance-policy.test.js world/hermes-bridge.test.js
/Users/artem/.hermes/hermes-agent/venv/bin/python -m unittest integrations/hermes/test_provider.py
npm test
```

The frozen `provenance-decision-stress-v2` oracle remains a v1 result. Its 24
cases are replayed against v1 in the policy tests; they are not relabelled as
host-attested evidence.
