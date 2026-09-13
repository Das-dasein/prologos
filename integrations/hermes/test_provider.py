"""Run with the Python environment from the installed Hermes checkout."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from plugins.memory import load_memory_provider


PROJECT = Path(__file__).resolve().parents[2]


class FakePluginLlm:
    calls = 0

    def __init__(self, *, plugin_id: str) -> None:
        self.plugin_id = plugin_id

    def complete_structured(self, **kwargs):
        type(self).calls += 1
        parsed = {"items": [{"program": "backup_ready(orion)."}], "explanation": "Explicit user statement."}
        return SimpleNamespace(
            parsed=parsed,
            text=json.dumps(parsed),
            provider="fake-provider",
            model="fake-model",
            usage=SimpleNamespace(input_tokens=10, output_tokens=5, total_tokens=15, cost_usd=0),
        )


class PrologWorldProviderTest(unittest.TestCase):
    def test_host_decision_tool_is_exposed(self):
        provider = load_memory_provider("prolog_world")
        schemas = {schema["name"]: schema for schema in provider.get_tool_schemas()}
        self.assertIn("world_memory_decide", schemas)
        self.assertEqual(schemas["world_memory_decide"]["parameters"]["required"], ["goal"])
        self.assertNotIn("actionPolicy", schemas["world_memory_decide"]["parameters"]["properties"]["goal"]["properties"])

    def test_host_decision_tool_runs_real_bridge_without_external_action(self):
        with tempfile.TemporaryDirectory(prefix="prolog-world-host-policy-") as root:
            home = Path(root) / "home"
            world = Path(root) / "world"
            home.mkdir()
            config = {
                "project_root": str(PROJECT),
                "ideas_path": str(PROJECT / "integrations/hermes/release-domain-v0.json"),
                "world_dir": str(world),
            }
            (home / "prolog-world.json").write_text(json.dumps(config), encoding="utf-8")
            provider = load_memory_provider("prolog_world")
            provider.initialize("session-host-policy", hermes_home=str(home), platform="cli", agent_identity="test")
            proposed = provider._call(
                "propose",
                source_text="Synthetic source: outage and certified independent route.",
                items=[
                    {"program": "main_down(orion)."},
                    {"program": "certified_route(orion)."},
                    {"program": "release(X) :- main_down(X), certified_route(X)."},
                ],
            )
            provider._call("admit", proposal_id=proposed["proposal_id"], by="test_operator", reason="Explicit offline fixture admission.")
            raw = provider.handle_tool_call(
                "world_memory_decide",
                {
                    "goal": {
                        "id": "provider_host_goal",
                        "text": "Check the synthetic release decision.",
                        "query": "release(orion)",
                        "action": "request_release_orion",
                        "questions": [],
                    }
                },
            )
            result = json.loads(raw)
            self.assertEqual(result["status"], "host_policy_decision")
            self.assertEqual(result["external_action"], "not_executed")
            self.assertEqual(result["decision"]["kind"], "act")
            self.assertEqual(result["decision"]["mode"], "simulated_action_request")

    def test_configured_provenance_threshold_cannot_be_weakened_by_the_model(self):
        with tempfile.TemporaryDirectory(prefix="prolog-world-provenance-policy-") as root:
            home = Path(root) / "home"
            world = Path(root) / "world"
            home.mkdir()
            config = {
                "project_root": str(PROJECT),
                "ideas_path": str(PROJECT / "integrations/hermes/release-domain-v0.json"),
                "world_dir": str(world),
                "decision_min_independent_fact_support_paths": 2,
            }
            (home / "prolog-world.json").write_text(json.dumps(config), encoding="utf-8")
            provider = load_memory_provider("prolog_world")
            provider.initialize("session-provenance-policy", hermes_home=str(home), platform="cli", agent_identity="test")
            proposals = []
            for source_text, forged_group in (("First model report says release is ready.", "forged_a"), ("Second model report says release is ready.", "forged_b")):
                proposed = json.loads(provider.handle_tool_call("world_memory_propose", {
                    "source_text": source_text, "programs": ["release(orion)."], "source_group": forged_group,
                }))
                proposals.append(proposed)
                provider._call("admit", proposal_id=proposed["proposal_id"], by="test_operator", reason="Explicit offline fixture admission.")
            raw = provider.handle_tool_call("world_memory_decide", {"goal": {
                "id": "configured_policy_goal", "text": "Check release.", "query": "release(orion)", "action": "request_release_orion",
                "actionPolicy": {"minIndependentFactSupportPaths": 1},
            }})
            result = json.loads(raw)
            self.assertEqual(result["authority"], "WorldAgent signed-horn safe policy v0 + independent-host-attested-lineage-support-v3")
            self.assertEqual(result["decision"]["kind"], "pause")
            self.assertEqual(result["decision"]["reason"], "insufficient_independent_fact_support")
            self.assertEqual(result["decision"]["provenance_policy"]["observed_support_path_count"], 2)
            self.assertEqual(result["decision"]["provenance_policy"]["eligible_support_path_count"], 0)
            context = provider._call("context")
            self.assertTrue(all(item["source_group_assurance"] == "event_local" for item in context["accepted"]))

    def test_session_reflection_creates_one_unaccepted_candidate(self):
        with tempfile.TemporaryDirectory(prefix="prolog-world-provider-") as root:
            home = Path(root) / "home"
            world = Path(root) / "world"
            home.mkdir()
            config = {
                "project_root": str(PROJECT),
                "ideas_path": str(PROJECT / "integrations/hermes/release-domain-v0.json"),
                "world_dir": str(world),
                "auto_reflect": True,
                "reflection_min_chars": 1,
            }
            (home / "prolog-world.json").write_text(json.dumps(config), encoding="utf-8")
            provider = load_memory_provider("prolog_world")
            self.assertIsNotNone(provider)
            provider.initialize("session-a", hermes_home=str(home), platform="cli", agent_identity="test")
            messages = [{"role": "user", "content": "Резерв для orion готов."}, {"role": "assistant", "content": "Принято."}]
            FakePluginLlm.calls = 0
            with patch("agent.plugin_llm.PluginLlm", FakePluginLlm):
                provider.on_session_end(messages)
                provider.on_session_end(messages)
            state = provider._call("context")
            self.assertEqual(FakePluginLlm.calls, 1)
            self.assertEqual(len(state["candidates"]), 1)
            self.assertEqual(len(state["accepted"]), 0)
            events = [json.loads(line) for line in (world / "events.jsonl").read_text(encoding="utf-8").splitlines()]
            interpretation = [event for event in events if event["type"] == "interpretation"]
            self.assertEqual(len(interpretation), 1)
            self.assertEqual(interpretation[0]["payload"]["evidence"]["trust"], "untrusted")


if __name__ == "__main__":
    unittest.main()
