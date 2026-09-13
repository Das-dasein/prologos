# Measurement repair v1.0.1 — before Luna smoke

Sol integration smoke completed 8 behavior + 1 extraction calls. Exact captured
inputs reveal that installed Hermes prepends generic identity, host/home path,
random work directory, profile directory, model/provider and date metadata to
`system_message`. No private memory or execution tools appeared. Those full
inputs are retained unchanged in `hermes-smoke-v1`; they are not strict matched
causal inputs. Sol results are integration diagnostics, not a model comparison.

The adapter now overrides the installed AIAgent system-prompt assembly hook to
return the frozen harness system text exactly. Before inference it checks that
actual messages equal exactly the requested system and user messages. Task
prompts, policy text, gold, expected moves and score definitions are unchanged.
The next Luna run uses a fresh report/source snapshot. This repair removes
runtime metadata confounding and is separate from the user-requested model change.
Do not compare differences between these Sol and Luna smoke results as model effects.

Observed Codex transport strips max_output_tokens on this backend. Requested
max_tokens remains 4096, but effective_output_token_cap is null; output tokens
are measured, not claimed capped. Calls remain bounded by 120s, one dispatched
inference, no tools, and 8MiB evidence cap. No fallback or retry is permitted.
