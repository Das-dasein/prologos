# Memory grounding review v2 smoke v1

Grounding review v2 binds each review to both the quarantined extraction
candidate hash and the content-addressed predicate-grounding policy identity.
The historical review-v1 contract and reports remain unchanged.

One input was frozen before the live call: `I mentor junior developers.` with
candidate `role(user,mentor)`. Luna returned `entailed`, copied the exact policy
identity `conversation_grounding@1.0.0` with SHA-256
`c012e2b9ca0f571d226076656324f62dc6919059dd2b342c94cb09b5782d402f`,
and passed local replay with zero diagnostics. The run made one provider call
and zero memory writes.

This resolves transport and contract binding for the disputed example only. It
does not measure review accuracy or establish product benefit. The live report
SHA-256 is
`a569130bcf303a3aa827097794cd0b13957776bcf398af36beecd71099805307`.

Replay without a provider call:

```bash
node verify-grounding-review-v2-smoke.cjs \
  reports/memory-grounding-review-v2-smoke-v1/luna/report.json \
  .cdr/waves/memory-grounding-review-v2-smoke-v1/fixture.json
```
