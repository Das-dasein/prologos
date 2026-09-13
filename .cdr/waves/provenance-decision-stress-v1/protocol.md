# Provenance decision stress v1 protocol

Status: superseded before any live model dispatch because the seed identifier
contained the wrong calendar date. This fixture remains immutable historical
pre-dispatch evidence. Live calls: 0. The corrected protocol is v2.

## Question

Does an executed checker receipt improve a model's downstream `act`, `ask`, or
`pause` decision over the same complete formal world read without execution?
The decision depends on proof provenance as well as entailment status: `act`
requires two complete positive support paths with disjoint fact source groups.

## Conditions

- **P0:** natural-language rules and facts with visible item IDs and source
  groups; no checker receipt.
- **P1:** equivalent signed-Horn rules and facts with the same visible item IDs
  and source groups; no execution.
- **P2:** byte-identical P1 prompt plus a trusted checker receipt containing raw
  and safe status and positive/negative support sets. The receipt contains no
  action, expected response, or oracle field.

Each condition must emit exactly two lines: `DECISION` and canonical `SUPPORT`.
P2 tests use of executed proof provenance. They do not test autonomous tool
choice because the host supplies the receipt.

## Frozen design

There are 24 deterministic cases: four replicas in each of six categories.
Depth alternates between three and four conjunction stages. The decision labels
are balanced at 8 `act`, 8 `ask`, and 8 `pause`.

- `independent_pair`: two disjoint positive proof paths;
- `independent_choice`: three positive paths, two sharing a source group, so a
  canonical independent pair must be selected;
- `insufficient`: one path or two paths sharing one fact source group;
- `unknown`: no complete path for either polarity;
- `conflict`: complete positive and explicit-negative paths;
- `contradicted`: only the explicit-negative path is complete.

The primary comparison is paired P1 versus P2 exact response accuracy. P0
versus P1 remains a separate representation diagnostic. Report exact response,
decision-only, support-only, format, and runtime validity by condition and
paired transitions. One call per case-condition, no retry, no fallback, and all
attempts remain in the denominator.

## Boundaries

This is synthetic gold memory with a deterministic host-authored decision
policy. It does not test extraction, admission, retrieval, autonomous checker
invocation, real-world action, or dreams. A P2 gain would show benefit for this
receipt and decision contract, not general Prolog utility. A null result would
apply only to this bounded fixture and model sample.

## Frozen evidence

- Fixture SHA-256: `ae5065e6cafec718ace9fa74e626e279f8e740fda6e7a7901ee64566fe938ffe`
- Cases: 24
- Planned calls: 72
- Live provider calls at freeze time: 0

Regenerate and compare without a provider call:

```bash
node world/provenance-decision-stress/test.cjs
```
