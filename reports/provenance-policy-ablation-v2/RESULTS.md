# Provenance policy ablation v2 results

The corrected deterministic replay matched all 44 authored case-policy cells
(11 cases × 4 policies). The conflict control also matched the real checker:
`raw_status=conflict`, `safe_status=unknown`; the standalone decision function
and `WorldAgent` ordering both pause before treating safe unknown as a missing
premise.

| Policy | Exact contract cells | Act | Ask | Pause |
| --- | ---: | ---: | ---: | ---: |
| safe proof | 11/11 | 8 | 1 | 2 |
| group disjointness v1 | 11/11 | 6 | 1 | 4 |
| host attestation v2 | 11/11 | 3 | 1 | 7 |
| lineage disjointness v3 | 11/11 | 1 | 1 | 9 |

The counts are unchanged from v1 because its authored expected decision for the
impossible conflict receipt was already `pause`. V2 repairs the evidence behind
that cell; it does not turn the matrix into an accuracy or utility result.

No LLM, provider, external source or network call was used. The cases are
synthetic and designed to exercise the gates, so the falling number of actions
must not be interpreted as improved safety or correctness.

Verify with:

```sh
npm run test:provenance-policy-ablation
```

