"""Read-only integrity/scoring audit; stdout is a standalone JSON artifact.

Usage: python3 audit-results.py raw-r1-verdicts [original-hard.json]
No model calls, retries, dataset mutation or independent CDR verdict.
"""
import collections
import hashlib
import json
import re
import sys
from pathlib import Path

base = Path(__file__).resolve().parent
root = (base / sys.argv[1]).resolve()
read = lambda p: json.loads(p.read_text())
digest = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
manifest = read(base / "manifest-transport-r1.json")
cases = read(base / "cases.json")
gold = read(base / "scorer-only.json")
result = read(root / "results.json")
assert len(cases) == len(result["records"]) == 30
assert [x["id"] for x in cases] == manifest["selected_source_ids"]
assert result["manifest_sha256"] == digest(base / "manifest-transport-r1.json")
assert not set(manifest["selected_source_ids"]) & set(manifest["selection"]["excluded_source_ids"])
assert collections.Counter(gold.values()) == {"A": 10, "B": 10, "C": 10}
source_bytes_verified = False
if len(sys.argv) > 2:
    source_file = Path(sys.argv[2])
    assert digest(source_file) == manifest["source"]["sha256"]
    source_rows = read(source_file)
    selected = []
    for label in ["A", "B", "C"]:
        eligible = [r for r in source_rows if r["answer"] == label and r["id"] not in manifest["selection"]["excluded_source_ids"]]
        selected += sorted(eligible, key=lambda r: hashlib.sha256(f"{manifest['selection']['seed']}:{r['id']}".encode()).hexdigest())[:10]
    selected.sort(key=lambda r: r["id"])
    assert [{k: r[k] for k in ["id", "context", "question"]} for r in selected] == cases
    assert {str(r["id"]): r["answer"] for r in selected} == gold
    source_bytes_verified = True

totals = {stage: collections.Counter() for stage in ["formalization", "M1", "M2"]}
correct = collections.Counter()
valid = collections.Counter()
statuses = collections.Counter()
disagreements = []
goal_only = []
failures = []
stage_count = 0
thread_ids = set()
for item in cases:
    case_id = item["id"]
    directory = root / f"case-{case_id}"
    record = read(directory / "record.json")
    assert record["source_id"] == case_id
    for stage in totals:
        receipt_file = directory / stage / "receipt.json"
        if not receipt_file.exists():
            failures.append({"case_id": case_id, "stage": stage, "error": "not_run"})
            continue
        stage_count += 1
        receipt = read(receipt_file)
        request = read(directory / stage / "request.json")
        assert receipt["stdout_sha256"] == digest(directory / stage / "stdout.jsonl")
        assert receipt["stderr_sha256"] == digest(directory / stage / "stderr.txt")
        events = [json.loads(line) for line in (directory / stage / "stdout.jsonl").read_text().splitlines() if line.strip()]
        starts = [event["thread_id"] for event in events if event.get("type") == "thread.started"]
        assert len(starts) == 1 and starts[0] not in thread_ids
        thread_ids.add(starts[0])
        assert request["prompt_sha256"] == hashlib.sha256(request["prompt"].encode()).hexdigest()
        assert request["timeout_ms"] == manifest["model_timeout_ms"]
        assert request["args"][request["args"].index("--model") + 1] == manifest["model"]
        if receipt.get("imported_from"):
            original_file = Path(receipt["imported_from"])
            assert receipt["source_receipt_sha256"] == digest(original_file)
            original = read(original_file)
            assert original["output"] == receipt["output"]
            assert (original_file.parent / "request.json").read_bytes() == (directory / stage / "request.json").read_bytes()
        if receipt["error"]:
            failures.append({"case_id": case_id, "stage": stage, "error": receipt["error"]})
        else:
            assert receipt["audit"]["no_tool_events"]
            assert receipt["audit"]["completed_turns"] == 1
            assert read(directory / stage / "final.txt") == receipt["output"]
        totals[stage].update(receipt["audit"]["usage"] or {})
        if stage != "formalization" and not receipt["error"]:
            valid[stage] += 1
            correct[stage] += receipt["output"]["answer"] == gold[str(case_id)]

    if record["formalization"]["error"]:
        continue
    formal = record["formalization"]["output"]
    observation = record["execution"].get("observation")
    transcript = observation["runtime"]["transcript"]["transcript"] if observation else ""
    matches = re.search(r",(entailed|contradicted|unknown|conflict|invalid_program|budget_exhausted),", transcript)
    status = matches[1] if matches else "runtime_error_or_unclassified"
    statuses[status] += 1
    only = re.search(r"only_in_goal\(\[([^]]*)\]\)", transcript)
    if only and only[1]:
        goal_only.append({"case_id": case_id, "gold": gold[str(case_id)], "symbols": only[1]})
    for stage in ["M1", "M2"]:
        request = read(directory / stage / "request.json")
        assert f"Model-authored program:\n{formal['program']}\n\nModel-authored query:\n{formal['query']}" in request["prompt"]
        assert item["question"] in request["prompt"]
        evidence = request["prompt"].split("\n\nExecution evidence:\n", 1)[1].rstrip("\n")
        if stage == "M1":
            assert evidence == "No executor was run for this condition. Determine the answer by reading the program."
        elif observation:
            assert evidence == transcript.rstrip("\n")
    m1 = record["conditions"]["M1"]["output"]
    m2 = record["conditions"]["M2"]["output"]
    if m1 and m2 and m1["answer"] != m2["answer"]:
        disagreements.append({"case_id": case_id, "gold": gold[str(case_id)], "M1": m1["answer"], "M2": m2["answer"], "executor_status": status})

for stage in ["M1", "M2"]:
    assert correct[stage] == result["summary"]["conditions"][stage]["correct"]
    assert valid[stage] == result["summary"]["conditions"][stage]["valid"]
producer_threads = set()
for stdout_file in (base / "raw-r1").glob("case-*/*/stdout.jsonl"):
    for line in stdout_file.read_text().splitlines():
        event = json.loads(line)
        if event.get("type") == "thread.started":
            producer_threads.add(event["thread_id"])
assert producer_threads <= thread_ids
print(json.dumps({"status": "local_integrity_and_score_recomputation_passed", "independent_cdr_review": False,
    "cases": 30, "source_bytes_and_selection_verified": source_bytes_verified, "stage_receipts": stage_count, "unique_model_threads": len(thread_ids), "reused_producer_threads": len(producer_threads), "checks": ["frozen source ids", "balanced labels", "excluded earlier ids", "raw hashes", "imported outputs unchanged", "same model and timeout", "tool-event gate", "shared program", "M1 evidence absence", "M2 exact transcript", "LLM final answer scoring", "unique model threads; imported stages not rerun"],
    "correct": dict(correct), "valid": dict(valid), "usage_by_stage": {k: dict(v) for k, v in totals.items()},
    "executor_statuses": dict(statuses), "answer_disagreements": disagreements, "goal_only_symbols": goal_only,
    "stage_failures": failures, "limitations": ["local mechanical audit, not independent beta", "formalization semantics not independently audited", "CLI sampling and effective token-budget equality not wire-verified", "post-start benign-notice classification amendment"]}, ensure_ascii=False, indent=2))
