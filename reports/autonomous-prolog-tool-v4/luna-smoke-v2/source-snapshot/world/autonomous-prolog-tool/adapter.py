"""Isolated Hermes inference with either zero tools or world_memory_query only."""
import contextlib
import copy
import io
import json
import os
import sys
import tempfile
import time
import uuid
from pathlib import Path
import httpx
from tool_transport_guard import AttemptBudget, GuardedTransport, PhysicalAttemptLimit, ALLOWED_TOOL

HERMES = Path(os.environ.get("HERMES_SOURCE", "/Users/artem/.hermes/hermes-agent"))
sys.path.insert(0, str(HERMES))
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "paired-biographies"))
from runtime_info import runtime_info

def jsonable(value):
    if hasattr(value, "model_dump"): return jsonable(value.model_dump())
    if isinstance(value, dict): return {str(k): jsonable(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)): return [jsonable(v) for v in value]
    if value is None or isinstance(value, (str, int, float, bool)): return value
    return str(value)

def tool_name(entry):
    if not isinstance(entry, dict): return None
    return entry.get("function", {}).get("name")

def main():
    if sys.argv[1:] == ["--config"]:
        from hermes_cli.config import load_config
        from hermes_cli.runtime_provider import resolve_runtime_provider
        load_config(); runtime = resolve_runtime_provider(requested="openai-codex")
        print(json.dumps({"model": runtime.get("model"), "provider": runtime.get("provider")})); return
    req = json.load(sys.stdin); evidence_path = Path(req["evidence_path"]); evidence_path.parent.mkdir(parents=True, exist_ok=True)
    enabled = bool(req["tool_enabled"]); config = req["config"]
    evidence = {"status": "starting", "inference_calls": 0, "tools": [], "tool_calls": [], "api_requests": [], "api_responses": [], "session_id": str(uuid.uuid4()), "started_at": time.time(), "requested_config": config, "tool_enabled": enabled, "prompt": {"system": req["system"], "user": req["user"]}, "world": req["world"]}
    def save():
        encoded = json.dumps(evidence, ensure_ascii=False, indent=2) + "\n"
        if len(encoded.encode()) > 16 * 1024 * 1024: raise RuntimeError("artifact exceeds 16 MiB")
        temporary = evidence_path.with_suffix(".json.tmp"); temporary.write_text(encoded); temporary.replace(evidence_path)
    evidence["runtime_identity"] = runtime_info()
    if evidence["runtime_identity"]["fingerprint"] != config.get("runtime_fingerprint"):
        evidence.update(status="failed", error={"type": "RuntimeDrift", "message": "installed runtime differs from run-start pin"}); save(); print(json.dumps({"status": "failed", "evidence_path": str(evidence_path)})); return
    save(); captured = io.StringIO()
    try:
        with contextlib.redirect_stdout(captured), contextlib.redirect_stderr(captured):
            from hermes_cli.config import load_config
            from hermes_cli.runtime_provider import resolve_runtime_provider
            load_config(); runtime = resolve_runtime_provider(requested=config["provider"], target_model=config["model"])
            with tempfile.TemporaryDirectory(prefix="autonomous-prolog-tool-") as directory:
                home = Path(directory) / "home"; work = Path(directory) / "work"; home.mkdir(); work.mkdir(); (home / "plugins").mkdir()
                os.symlink(req["plugin_path"], home / "plugins" / "prolog_world")
                os.environ["HERMES_HOME"] = str(home); os.environ["TERMINAL_CWD"] = str(work); os.environ["HERMES_SESSION_ID"] = evidence["session_id"]; os.chdir(work)
                (home / "config.yaml").write_text("memory:\n  memory_enabled: false\n  user_profile_enabled: false\n  provider: prolog_world\nagent:\n  max_retries: 0\n  tool_use_enforcement: false\ncompression:\n  enabled: false\nplugins:\n  enabled: []\n")
                (home / "prolog-world.json").write_text(json.dumps({"project_root": req["project_root"], "ideas_path": req["world"]["ideas_path"], "world_dir": req["world"]["directory"], "auto_reflect": False}))
                from run_agent import AIAgent
                budget = AttemptBudget(evidence, save, max_dispatches=2 if enabled else 1, tools_enabled=enabled)
                class ControlledAgent(AIAgent):
                    def _create_openai_client(self, client_kwargs, *, reason, shared):
                        kwargs = dict(client_kwargs); kwargs["max_retries"] = 0; kwargs["http_client"] = httpx.Client(transport=GuardedTransport(budget), follow_redirects=False, trust_env=False, timeout=config["request_timeout_ms"] / 1000)
                        client = super()._create_openai_client(kwargs, reason=reason, shared=shared)
                        if client.max_retries != 0: raise RuntimeError("SDK retries must be zero")
                        return client
                agent = ControlledAgent(api_key=runtime.get("api_key"), base_url=runtime.get("base_url"), provider=runtime.get("provider"), api_mode=runtime.get("api_mode"), model=config["model"], enabled_toolsets=["memory"] if enabled else [], skip_memory=not enabled, skip_context_files=True, load_soul_identity=False, session_db=None, session_id=evidence["session_id"], max_iterations=2 if enabled else 1, max_tokens=config["max_tokens"], reasoning_config={"effort": config["reasoning_effort"]}, fallback_model=None, quiet_mode=True, save_trajectories=False, checkpoints_enabled=False)
                if enabled:
                    agent.tools = [entry for entry in agent.tools if tool_name(entry) == ALLOWED_TOOL]
                    agent.valid_tool_names = {ALLOWED_TOOL}
                    if [tool_name(entry) for entry in agent.tools] != [ALLOWED_TOOL]: raise RuntimeError("isolated query tool was not loaded exactly once")
                    manager = agent._memory_manager
                    if manager is None: raise RuntimeError("prolog_world memory provider was not initialized")
                    for provider in manager.providers:
                        provider.prefetch = lambda *args, **kwargs: ""; provider.sync_turn = lambda *args, **kwargs: None
                    original_handle = manager.handle_tool_call
                    def handle(name, args, **kwargs):
                        if name != ALLOWED_TOOL or len(evidence["tool_calls"]) >= 1: raise RuntimeError("only one world_memory_query call is allowed")
                        record = {"name": name, "args": jsonable(copy.deepcopy(args)), "started_at": time.time()}; evidence["tool_calls"].append(record); save()
                        result = original_handle(name, args, **kwargs); record.update(result=result, ended_at=time.time()); save(); return result
                    manager.handle_tool_call = handle
                if (not enabled) and agent.tools: raise RuntimeError("no-tool condition exposed tools")
                evidence["tools"] = jsonable(agent.tools); evidence["dispatch_policy"] = {"sdk_max_retries": 0, "http_transport_retries": 0, "physical_attempt_limit": 2 if enabled else 1, "allowed_tool": ALLOWED_TOOL if enabled else None, "headers_recorded": False}
                agent._build_system_prompt = lambda system_message=None: req["system"]
                original_build = agent._build_api_kwargs
                def build(messages, *args, **kwargs):
                    evidence.setdefault("model_messages_by_inference", []).append(jsonable(copy.deepcopy(messages)))
                    value = original_build(messages, *args, **kwargs); evidence["api_requests"].append(jsonable(copy.deepcopy(value))); save(); return value
                agent._build_api_kwargs = build
                original_stream = agent._run_codex_stream
                def stream(api_kwargs, *args, **kwargs):
                    evidence["inference_calls"] += 1; evidence["wire_model"] = api_kwargs.get("model"); save()
                    result = original_stream(api_kwargs, *args, **kwargs); value = jsonable(result); evidence["api_responses"].append(value); evidence["reported_response_model"] = value.get("model"); evidence["provider_terminal_status"] = value.get("status"); save(); return result
                agent._run_codex_stream = stream
                agent._run_codex_create_stream_fallback = lambda *args, **kwargs: (_ for _ in ()).throw(PhysicalAttemptLimit("stream fallback disabled"))
                result = agent.run_conversation(req["user"], system_message=req["system"], conversation_history=[])
                evidence["result"] = jsonable(result); evidence["final_response"] = result.get("final_response", ""); evidence["usage"] = {k: v for k, v in evidence["result"].items() if "token" in k or "usage" in k or "cost" in k}
                terminal = evidence.get("provider_terminal_status") == "completed" and evidence["denied_physical_attempts"] == 0 and evidence["physical_dispatches"] == evidence["inference_calls"] and all(x["status"] in ("completed", "closed") for x in evidence["physical_attempts"])
                evidence["status"] = "failed" if result.get("failed") or not terminal else "ok"
    except BaseException as exc:
        message = str(exc); secret = runtime.get("api_key") if "runtime" in locals() else None
        if secret: message = message.replace(secret, "[REDACTED]")
        evidence.update(status="failed", error={"type": type(exc).__name__, "message": message})
    finally:
        evidence["bootstrap_log_retained"] = False; evidence["ended_at"] = time.time(); save()
    print(json.dumps({"status": evidence["status"], "evidence_path": str(evidence_path)}))

if __name__ == "__main__": main()
