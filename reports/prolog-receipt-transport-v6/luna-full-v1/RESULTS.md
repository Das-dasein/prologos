# Prolog receipt transport v6: full result

## Outcome

The frozen 32-cell paired wave completed with 32/32 runtime-valid cells on
`gpt-5.6-luna` at low reasoning effort. Every cell made exactly one correct
`world_memory_query` call over the real checker and two physical model
dispatches. All 32 raw checker results matched the frozen oracle. There were no
denied calls, retries or fallbacks. Independent replay verified report SHA-256
`a85b098d516bc602de15d8f547633d9db823dcc24c780ed9b0d75e24748867ea`.

| Receipt delivered to model | Status correct | Support exact | Canonical exact |
| --- | ---: | ---: | ---: |
| R: existing raw checker result | 16/16 | 11/16 | 11/16 |
| C: compact target-only projection | 16/16 | 15/16 | 15/16 |

Compact transport improved four paired cases and worsened none. Eleven pairs
were exact in both conditions and one pair was wrong in both. With only four
discordant pairs, the exact two-sided McNemar result is `p = 0.125`; this is a
useful engineering signal, not a statistically established effect.

## Where the errors remain

Status survived the receipt-to-answer step in all 32 cells. The remaining
failures were exact provenance transcription errors after a correct solver
receipt.

| Frozen target status | Raw exact | Compact exact |
| --- | ---: | ---: |
| `entailed` | 3/4 | 4/4 |
| `contradicted` | 4/4 | 4/4 |
| `unknown` | 4/4 | 4/4 |
| `conflict` | 0/4 | 3/4 |

The raw form failed in all four conflict cases and one entailed case. The
compact form failed in one conflict case, which the raw form also failed. Thus
compact transport sharply reduced the observed long-list copying problem but
did not make the LLM continuation deterministic.

## Transport and token size

The existing raw checker result includes the entire derivation surface and all
intermediate support records. It averaged 64,019 bytes per cell (range
34,650–95,488). The deterministic compact projection contains only the query,
four-way status, and target/opposite minimal support sets; it averaged 512.75
bytes (range 141–936), about 125 times smaller.

Recorded model usage across the 16 cells per condition was:

| Receipt | Input tokens | Output tokens | Total tokens | Mean total/cell |
| --- | ---: | ---: | ---: | ---: |
| R | 425,046 | 10,043 | 435,089 | 27,193.06 |
| C | 79,061 | 4,209 | 83,270 | 5,204.38 |

Compact transport used about 80.9% fewer total tokens in this paired run. This
is a system-interface result for the recorded provider accounting, not a claim
about every model or pricing regime.

## Interpretation

Together with v5, the evidence supports this architecture:

1. Let the model decide whether a formal query is useful.
2. Expose a narrow, typed `world_memory_query` interface rather than arbitrary
   trusted Prolog writes.
3. Execute the query in the deterministic checker.
4. Project the checker result locally into a compact target-scoped receipt.
5. Treat the host receipt as authoritative; do not rely on the model to
   reproduce long support arrays without validation.

V5 showed that the model can autonomously select and formulate the query, but
does so only in 9/16 cases. V6 isolates the next failure boundary: when a call
is made, the solver result is correct, while receipt presentation materially
affects provenance fidelity and token use. The host can eliminate the copying
failure entirely for machine consumers by attaching the signed/hashed receipt
directly instead of asking the LLM to reserialize it.

This wave does not establish a general Prolog advantage, natural-language to
logic translation fidelity, better real-world decisions, or production safety.
It tests receipt transport on one model and 16 synthetic signed-Horn worlds.

## Reproduction

```sh
npm run test:prolog-receipt-transport-v6
node world/prolog-receipt-transport-v6/verify-report.cjs \
  reports/prolog-receipt-transport-v6/luna-full-v1
npm run analyze:prolog-receipt-transport-v6 -- \
  reports/prolog-receipt-transport-v6/luna-full-v1
```

The analysis command deterministically verifies the terminal report and either
creates `analysis.json` exclusively or checks that the existing file matches
replay.
