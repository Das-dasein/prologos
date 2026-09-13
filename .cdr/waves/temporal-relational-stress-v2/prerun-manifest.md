# Temporal relational stress v2 pre-run manifest

Frozen on 2026-09-13 before any v2 model call. Base revision before v2
implementation: `845f4f7`.

| Artifact | SHA-256 |
| --- | --- |
| `world/temporal-relational-stress/generator.cjs` | `2054ac3bbffc855d786108189f8e11c1d22d8643d1090990fe54c7268085308c` |
| `world/temporal-relational-stress/test.cjs` | `4eda1a5b13443ad7bde3b190c598f46f03413f9654dbf491425067eeaf71e4d3` |
| `world/temporal-relational-stress/verify-fixture.cjs` | `8260e6c6842b0af1b3262d1e6c22c7f91bc24dad27feafa1b13b59654408e402` |
| `world/temporal-relational-stress/collector.cjs` | `027af96ae8444cbde91c8e00838c29b5628d94ae4d12c711b508c901a417086f` |
| `world/temporal-relational-stress/collector.test.cjs` | `fcd161e716d02e609653b4b78c099112cba2eb20e39700d3b9d277d9a9528746` |
| `world/temporal-relational-stress/verify-report.cjs` | `57251089770815049a209514029253c683307db4eec162211770d433078321dd` |
| `world/temporal-relational-stress/analyze-report.cjs` | `1b25dac24519f34f0063427590de4e88c7de8c070fadf5990420d1ccf01755a9` |
| `.cdr/waves/temporal-relational-stress-v2/protocol.md` | `006579aae2eacc1270bc650871fc90125e1a3abaa1be4ddc8b9674e31803bf22` |
| `.cdr/waves/temporal-relational-stress-v2/fixture.json` | `5548271441e7ef641f37b2032ffba0cc63e943ffe8332b15d16c85bec0538df4` |

Frozen fixture properties:

- 32 cases and 1,738,221 bytes;
- 16 cases each at measured rule depth 4 and 7;
- 16 relational chain-of-joins and 16 relational diamond cases;
- 16 cases each with 2 and 4 revisions;
- 8 cases each ending `entailed`, `contradicted`, `unknown` and `conflict`;
- every non-unknown support traverses at least two cross-entity binary facts and
  contains a current replacement item;
- every proof has the declared measured rule depth;
- every unknown world is exactly one bridge rule away from either polarity;
- replaced origins and their dependent copies are absent after restart;
- every no-dependency ablation ends in `conflict`;
- P1F is serialized directly from the active snapshot used by the checker;
- opaque item and predicate names do not encode route roles or target status;
- independent replay over retained active items reproduces every status and
  complete positive/negative minimal support set.

The generator refuses to overwrite an existing output path. Verification
regenerates all cases byte-for-byte and reruns all retained active snapshots
through SWI-Prolog.

## Full-run prompt correction

The first two-case transport smoke showed that the answer contract named the
`status` field but did not enumerate its four allowed string values. The model
used `both` for a conflict in P0/P1F and `true` in P1. Those outputs cannot be
treated as clean status failures under an underspecified label contract. The
entire smoke is retained as excluded engineering evidence with report SHA-256
`46b799371883f04f0d5d3062290558eb1311df2c74fd54d4a1785e830faf219c`.

Before any full-run call, the prompt was corrected to require exactly
`entailed`, `contradicted`, `unknown`, or `conflict`; all 32 fixtures were
regenerated and reverified. No semantic world, event, oracle or scorer rule
changed.

| Full-run artifact | SHA-256 |
| --- | --- |
| `world/temporal-relational-stress/generator.cjs` | `09ad486709d621dc867bf783e169313d1ad0ad67b6f51a4a713530d5e66a83b9` |
| `world/temporal-relational-stress/test.cjs` | `4eda1a5b13443ad7bde3b190c598f46f03413f9654dbf491425067eeaf71e4d3` |
| `world/temporal-relational-stress/verify-fixture.cjs` | `a0f8782e4405c3b67426c369d3f8f133071a317b66529a5c3729ddb0e8d65061` |
| `world/temporal-relational-stress/collector.cjs` | `9328f9f368d00d3063ed853153777014941b82b9dae49b45f9e09a65decf859b` |
| `world/temporal-relational-stress/collector.test.cjs` | `fcd161e716d02e609653b4b78c099112cba2eb20e39700d3b9d277d9a9528746` |
| `world/temporal-relational-stress/verify-report.cjs` | `57251089770815049a209514029253c683307db4eec162211770d433078321dd` |
| `world/temporal-relational-stress/analyze-report.cjs` | `1b25dac24519f34f0063427590de4e88c7de8c070fadf5990420d1ccf01755a9` |
| `.cdr/waves/temporal-relational-stress-v2/fixture.json` | `d65c9825312799a608dc1f22b0829efec294d01953030cccb9affac22ce84cc2` |

The full run must use the corrected fixture and source bytes in this second
table. No full-run model call existed when they were recorded.
