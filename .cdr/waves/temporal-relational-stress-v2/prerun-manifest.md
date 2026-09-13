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
