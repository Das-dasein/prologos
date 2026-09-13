# Product extraction v4 smoke v1

One pre-frozen ambiguous-pronoun message was sent once to `gpt-5.6-luna`
through the product Codex provider. The provider accepted the checked-in
`memory-extraction-v4` schema and returned `decision: clarify` with the exact
source span `He uses Python.`. It emitted no assertions or ontology candidates.

The candidate passed local schema, source-grounding, and validator-v2 replay
with zero diagnostics. The collector performed zero admission writes. The live
report SHA-256 is
`78b39212c4646051ba54dba4564ca6b678c38bb7df8bc793329c171d3d4e4865`.

This establishes only that the v4 transport and explicit clarification path
worked for one pinned input. It does not measure precision, recall, coreference
resolution, or improvement over v3. A multi-case wave must be frozen before
using v4 behavior to make a comparative claim.

The fixture, collector, validator source, prompt/schema source, and generated
JSON schema were hashed before the call. The provider adapter was preserved
only as a post-call snapshot, so exact adapter provenance is incomplete. The
model name records the pinned CLI argument rather than a provider response
envelope.

Reproduce the local replay without a provider call:

```bash
node test-product-extraction-v4-smoke.js
```
