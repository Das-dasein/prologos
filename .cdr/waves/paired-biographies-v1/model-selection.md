# Model selection amendment — v1.0.1

Changelog: v1.0.1 records the operator's cheaper-model steering before the Luna run.

On 2026-09-10, after the initial Sol smoke had completed, the operator asked:
«можем гермес на модели попроще запускать? тера или луна».

The next development run uses `gpt-5.6-luna`, provider `openai-codex`, reasoning
effort `low`, in all four conditions and the separate extraction lane. The
operator also named `gpt-5.6-terra`; the CLI may select it for a separate run.
Availability in the connected Hermes runtime is verified by the actual call,
not inferred from the public model catalogue.

The eight behavioral calls and one extraction call in
`reports/paired-biographies-v1/hermes-smoke-v1/` used `gpt-5.6-sol` and retain that
identity. They are integration-smoke evidence only. Do not pool them with Luna
measurements or backfill one model's missing responses with another model.

This amendment changes model selection only. Dataset semantics, oracles, pair
relations, prompt policy and score definitions remain frozen. Keep global Hermes
configuration unchanged; pass the experiment's model explicitly to the runner.
