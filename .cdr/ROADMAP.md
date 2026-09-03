# CDR roadmap: Prolog agent memory

| Wave | Question | Primary output | Opens when |
|---|---|---|---|
| `prolog-memory-eval-v0` | Can the evaluation distinguish symbolic correctness, extraction quality, and end-to-end utility? | Pre-registered method, fixture schema, 12-case pilot dataset | Initial open-claim selection |
| `symbolic-oracle-v1` | Does the Prolog layer produce the correct active state, conflicts, and provenance from gold claims? | Deterministic results and failure taxonomy | v0 receives GO or BOUNDED-GO |
| `extraction-v1` | Can the model safely turn dialogue into the required memory operations? | Extraction metrics and error corpus | Symbolic oracle reaches GO |
| `comparative-e2e-v1` | Does Prolog-backed memory beat the strongest baseline under a fixed budget? | Comparative result table and raw outputs | Extraction reaches GO or bounded threshold |
| `adversarial-v1` | Does the result survive aliases, corrections, hypotheticals, injection attempts, and temporal ambiguity? | Robustness report | Comparative wave reaches GO or BOUNDED-GO |
| `synthesis-v1` | What claim is transmissible, and within which bounds? | Final synthesis receipt and report | Prior receipts available |

Each transition is verdict-driven. Calendar time or implementation completion
alone does not open the next wave.
