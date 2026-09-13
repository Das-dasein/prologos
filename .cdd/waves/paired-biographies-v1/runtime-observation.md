# Installed Hermes observation — v1.0.1

Changelog: v1.0.1 adds the empty-toolset and context-file isolation controls.

Read-only inspection, 2026-09-10. Source checkout:
`/Users/artem/.hermes/hermes-agent`, HEAD
`f5be9236e00ddf2f2a412697f267078fc4ee068e`.
Python: `/Users/artem/.hermes/hermes-agent/venv/bin/python`.
Configured model: `gpt-5.6-sol`; provider `openai-codex`.
Existing CLI enables global built-in memory, user profile and `prolog_world`.

## Interface evidence

- `run_agent.py:435`: `AIAgent` accepts `enabled_toolsets`, `skip_memory`,
  `skip_context_files`, `load_soul_identity`, `session_db`, `session_id`,
  `max_iterations`, `max_tokens`, `reasoning_config`, `fallback_model`.
- `model_tools.py:389` checks `enabled_toolsets is not None`; an explicit empty
  array can select no toolsets. Verify the actual agent.tools is empty; do not
  assume absence of a CLI option disables tools.
- `agent/agent_init.py:1665`: `skip_memory=True` avoids the built-in memory
  initialization and external provider, unless `memory` is explicitly enabled.
- `agent/system_prompt.py:193,480`: `skip_context_files=True` together with
  `load_soul_identity=False` suppresses project and identity file injection.
- `run_agent.py:7577`: `run_conversation(user_message, system_message=None,
  conversation_history=None, ...)` returns a dictionary. Hermes oneshot reads
  `final_response`, `failed`, usage and session fields from that result.
- `hermes_cli/oneshot.py:324` onward shows the established resolver flow:
  `load_config()`, `resolve_runtime_provider(requested=..., target_model=...)`,
  then `AIAgent(api_key=...,base_url=...,provider=...,api_mode=...,model=...)`.
  Credentials must remain in process memory, never in request/report files.
- `hermes_constants.get_hermes_home()` resolves the environment dynamically;
  initialize per-call isolated HERMES_HOME and working directory before the
  agent is constructed. Auth/config discovery can be an explicit bootstrap
  step before switching to isolated runtime; do not copy private memory.

## Required integration distinctions

Using the installed AIAgent with gold memory injected tests controlled
Hermes reasoning, not the production provider's autonomous retrieval or
admission policy. Record that boundary. A host checker receipt fed into the
checked condition is harness-enforced proof consumption; it is not evidence of
an autonomous model tool choice. Never imply that a prompt instruction alone
enforces checker use. Extraction must be its own actual model call/score, with
gold-memory evaluation separately identified.

This is a code inspection, not yet a live integration verification. The
implementation alpha must test construction, provider access, exact model-visible
inputs and absence of undeclared tools on the actual runtime.
