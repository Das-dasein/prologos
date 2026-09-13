# Extracted-memory E2E replay v2

Status: completed deterministic development replay; independently recomputed
from pinned inputs.

Report SHA-256:
`3dd02af454cd81d20bbc2002eb7e426faafb291b898ceedf04602511c29e7054`.

This replay takes retained Luna extraction outputs through the actual
`WorldAgent` lifecycle: source events, one proposal per candidate, trusted
signed-Horn validation, explicit-user-only admission, active snapshot, checker
and deterministic missing-premise next-step policy. It makes no new model call.

| Candidate lane | Correct full decision | Status correct | Move correct | Accepted items | Runtime rejections |
| --- | ---: | ---: | ---: | ---: | ---: |
| Original first pass | 17/24 | 19/24 | 17/24 | 37 | 16 |
| After bounded syntax + qualifier repair | 24/24 | 24/24 | 24/24 | 53 | 0 |

Seven cases change from an incorrect first-pass decision to the authored next
move: `p01_a`, `p01_b`, `p04_a`, `p04_b`, `p05_a`, `p05_b`, and `p10_a`.
The invalid rules in the first pass are rejected before admission; the agent
therefore pauses where a repaired rule would support an action or question.

`p12_a` is an important non-change. Its first-pass conjunction is invalid, but
the expected decision is already to pause because no eligible question covers
the missing plan. The behavior remains correct despite non-exact extraction.
Thus the extraction improvement from 16/24 to assisted 24/24 produces a behavior
improvement from 17/24 to 24/24, not a mechanically identical score change.

The admission rule is explicit and deterministic: accept only candidates from
actual user messages with modality `asserted`, after trusted per-item validation;
retain reported and uncertain candidates. Acceptance means usable in this
synthetic replay and does not certify external truth.

This is not a fresh end-to-end dialogue run: it reuses the frozen first-pass and
repair responses. It does not test whether the model spontaneously requests
feedback, whether a human would approve the semantic annotations, or whether
the same gains generalize beyond 24 synthetic cases. It does establish that the
bounded repairs causally change the real memory/checker/policy path on seven
stored episodes.

Verification:

```sh
node world/paired-biographies/verify-extracted-memory-e2e.cjs reports/paired-biographies-v1/extracted-memory-e2e-v2
```

V2 normalizes nondeterministic SWI stream addresses in retained rejection
messages. Two fresh verifier executions reproduced the complete 24-record JSON
semantics. V1 has the same scores but cannot be byte-compared across replays and
is retained only as preliminary engineering evidence.
