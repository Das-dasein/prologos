# Live-run record: 2026-09-09

The local directory `raw-luna-v1-20260909` contains all 36 planned calls and is intentionally ignored by Git. This is a failure record, not an experimental result.

The original runner classified every call as `trace_gate_failed`. A read-only audit of the retained bytes found the same five-event model stream in all 36 calls: `thread.started`, `turn.started`, the exact Codex skills-context notice, one `agent_message`, and `turn.completed`. There were no observed tool-call items. The audit also confirmed all raw stdout, stderr, and prompt hashes; each captured final output matched the sole agent-message JSON and the requested top-level schema. Six calls have nonempty host stderr and remain separately recorded; this does not establish a clean host execution.

The run is still unusable for its stated M1/M2 comparison. The original trace classification caused every M0 candidate to be discarded before prompt construction. Consequently all 24 review prompts say `M0 unavailable`; zero M2 prompts contain `near_signature_audit`. A post-run trace reclassification cannot change what the model was shown.

`audit-near-signature-reflection-run.js` creates the local `post-run-audit.json` and `post-run-audit.html`, including each prompt and captured JSON response. It preserves every original receipt byte-for-byte. The runner now accepts only the exact pinned skills-context notice as non-tool output, and its sealed fake integration test covers that case. Any subsequent live comparison must be preregistered as a new run and use the repaired runner.
