# Provenance decision stress v2 protocol

Status: frozen on 2026-09-13 before any live model dispatch. This supersedes v1,
whose seed identifier contained the wrong date and received zero provider calls.

## Question and conditions

Does an executed checker receipt improve a model's downstream `act`, `ask`, or
`pause` decision over the same complete formal world read without execution?
The decision depends on proof provenance as well as status: `act` requires two
complete positive support paths with disjoint fact source groups.

- **P0:** natural-language facts and rules with visible item IDs and source
  groups; no checker receipt.
- **P1:** equivalent signed-Horn facts and rules with the same item IDs and
  source groups; no execution.
- **P2:** byte-identical P1 prompt plus a trusted checker receipt containing raw
  and safe status and positive/negative support sets. It contains no action,
  expected response, or oracle field.

Each response is exactly two lines: `DECISION` and canonical `SUPPORT`. P2 tests
use of supplied execution evidence; it does not test autonomous tool choice.

## Frozen design and analysis

There are 24 deterministic SWI-checked cases, four replicas in each of six
categories, with conjunction depth three or four. Labels are balanced at 8
`act`, 8 `ask`, and 8 `pause`. Cases cover independent pairs, canonical choice
among three paths, shared or single-source insufficiency, unknown, conflict,
and explicit contradiction.

The primary paired comparison is P1 versus P2 exact response accuracy. P0
versus P1 is a separate representation diagnostic. Report exact response,
decision-only, support-only, format, runtime validity, token totals, and paired
transition cells. The 72-call order uses three Latin-square rotations, one call
per case-condition, no retry, no fallback, and all attempts in the denominator.

## Boundaries

This is synthetic gold memory with a deterministic host-authored policy. It
does not test extraction, admission, retrieval, autonomous checker invocation,
real-world action, or dreams. A P2 gain would apply to this receipt and policy
contract, not establish general Prolog utility.

- Fixture SHA-256: `6aeb1c9021bfea99dbfe13e25fbec46fb54c7d6f21fbf963d136380a58692b24`
- Cases: 24
- Planned calls: 72
- Live provider calls at freeze time: 0

Provider-free checks:

```bash
node world/provenance-decision-stress/test.cjs
node world/provenance-decision-stress/collector.test.cjs
node world/provenance-decision-stress/collector.cjs offline
```
