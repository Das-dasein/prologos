# Temporal receipt ablation v3 — frozen design

## Question

After holding temporal projection fixed, which observed improvement comes from
the model's own multi-step inference, copying a supplied verdict, or copying
supplied provenance IDs?

## Frozen population and conditions

The deterministic fixture has 32 synthetic signed-Horn worlds: depth 7 or 8,
chain-of-joins or diamond topology, two construction variants, and each of the
four signed statuses. Every prompt contains only the final active snapshot;
event history, replacement events, and dependency projection are absent from
all four conditions.

| Condition | Extra trusted data | Primary interpretation |
| --- | --- | --- |
| L | none | model-only logical inference and support recovery |
| V | `status` only | verdict copying, while supports still require recovery |
| S | positive/negative support IDs only, no `status` | provenance copying / polarity reading without direct verdict text |
| F | status and support IDs | full receipt transport |

All calls must be one physical dispatch, no retry, fallback or tools. The
answer contract and scorer require status plus both canonical support lists in
every condition. Condition order is rotated per case. The fixture refuses
overwrites and verification regenerates it byte-for-byte and replays every
active snapshot through the checker.

## Decision rules

`L` is the only condition that measures model-only multi-step reasoning. A
`V−L` status difference is verdict transport, not a Prolog or reasoning
advantage. An `S−L` support difference is receipt/provenance transport; it is
not evidence that the model reconstructed the proof. `F` is an engineering
end-to-end protocol check. Paired exact McNemar tests will be reported only
after a completed frozen live wave.

This is synthetic bounded engineering evidence. It does not establish a
general Prolog advantage, extraction fidelity, clinical utility, or real-world
agent performance.
