# Harness design and plan — v1.0.0

Gap: the authored paired dataset has no four-condition isolated Hermes runner.
Binding contract: gamma-scaffold v1.0.1, WIRE v1.0.0, protocol v1.0.1.

Design: a fail-closed dataset boundary (official JSON Schema plus reference,
pair, provenance and temporal invariants), real journal replay and SWI proof
checks, whitelist-only prompt projections, strict structural model scoring,
and a fresh Python AIAgent process per call. Checked receipts bind current
snapshot and query; first three projections contain no computed checker data.
Extraction calls consume only dialogue/vocabulary/admission policy and have a
separate candidate score. Gold annotations remain immutable evaluation inputs.

Active generation skills: eng/tool, eng/test, eng/performance-reliability.
Lifecycle: CDD.md, alpha, design, plan. Local scope overrides remote branch,
commit/push and release clauses. Peer set: four behavior prompts, extraction
prompt, dataset producer/schema/validator, adapter request/response, scorer and
CLI reports. Existing production provider/CLI intentionally untouched.

Order: negative tests and interface contracts; validator/replay; prompts/scores;
AIAgent isolation/capture; runner/report; offline checks; 8 behavior + 1
extraction real smoke; docs/self-coherence; independent beta before full run.

Budgets: one isolated agent per call; zero tools; max one dispatched inference,
outer timeout 120 seconds; 4096 requested output tokens; 256 KiB input;
8 MiB artifact output. No retries or fallback. Actual provider limits and token
usage are recorded; requested and provider-effective caps may differ.
