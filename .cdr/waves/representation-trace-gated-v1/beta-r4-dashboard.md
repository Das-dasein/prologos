# CDR beta r4: independent live-evidence dashboard

- Reviewer: Astra, independent CDR β review.
- Review date: 2026-09-06.
- Source raw root: `/tmp/representation-cdr-alpha-r3.I1KHoh/raw`.
- Fixture SHA-256: `f8a8286bd06df2e8945d82a3439ca2e7a7fece884e5473cf39cfbda9bb2e95e3`.
- Recorded model: `gpt-5.4-mini`.

| Condition | Recorded calls | Correct final answers | Valid protocol evidence |
| --- | ---: | ---: | ---: |
| P0 | 24 | 24/24 | 24/24 no command/tool events |
| P1 | 24 | 24/24 | 24/24 no command/tool events |
| P2 | 24 | 24/24 | 23/24 one sealed broker lifecycle and matching receipt |

β independently recomputed every fixture oracle with local SWI-Prolog. All 24
P2 final answers and all 23 P2 broker receipts agree with that oracle. The one
protocol failure is `rw-d3-chain-unknown-r2-p2` in
`codex-v10-sealed-bMuTKv`: its final answer is correct, but its JSONL has no
broker action and its state has no receipt; it is not a valid P2 observation.

The initial r3 parser rejected valid SWI diagnostics. The final provider-free
parser repair permits only the sealed `sealed-program.pl` path with a numeric
source-location suffix, and tokenizes absolute paths only at a string boundary
or after whitespace. Its regression test also rejects a foreign absolute path.
Derived revalidation r4 reports 23 trace-valid, 23 correct among trace-valid,
23 matching receipts, and one rejection; SHA-256:
`3eb1bba327036258821919b3633b2d0c0f976bdba7993c742d02ba17a70fc10a`.

## Verdict: REVISE

P0 and P1 both reach 24/24, so the measured P0-to-P1 difference is zero
percentage points and RFR-C1 is not established. P2 is visibly executed but
only 23/24 records satisfy its declared broker protocol, so no P1-to-P2 effect
claim is available. This review closes the cycle with a no-effect/incomplete
protocol result; it does not authorize a rerun or reinterpret a correct final
answer without its required P2 evidence.
