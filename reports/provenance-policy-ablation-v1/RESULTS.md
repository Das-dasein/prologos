# Provenance policy ablation v1 results

The frozen deterministic replay matched all 44 authored case-policy cells
(11 cases × 4 policies). No LLM, provider, external source, or network call was
used.

| Policy | Exact contract cells | Act | Ask | Pause |
| --- | ---: | ---: | ---: | ---: |
| safe proof | 11/11 | 8 | 1 | 2 |
| group disjointness v1 | 11/11 | 6 | 1 | 4 |
| host attestation v2 | 11/11 | 3 | 1 | 7 |
| lineage disjointness v3 | 11/11 | 1 | 1 | 9 |

The informative transitions are structural:

- v1 rejects duplicate items from one recorded source group;
- v2 rejects different groups that lack host attestation, including repeated
  model proposals and mixed attested/local support;
- v3 rejects separately attested publishers with one known upstream origin and
  rejects attested sources whose upstream lineage is missing;
- all four policies retain the authored unknown, conflict, and contradicted
  controls.

The falling number of `act` decisions is not an accuracy result. The cases were
constructed to exercise each gate, and their expectations are part of the
fixture. This result establishes executable contract coverage only. It does not
measure source truth, hidden-copy detection, false-pause cost, model behavior,
or downstream utility.

Fixture SHA-256:
`95fbdfb265810305e519dc39938efb1b39099b27c7662fc1e953aca61ccba54b`.

Verify with:

```sh
npm run test:provenance-policy-ablation
```
